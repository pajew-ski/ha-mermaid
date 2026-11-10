import type { HomeAssistant } from "./types";

/**
 * Resolves ${...} template expressions in Mermaid diagram content.
 *
 * Each expression is parsed by a small recursive-descent parser that only
 * knows the functions listed in ARITY (an allowlist), so diagram content is
 * never evaluated as JavaScript.
 *
 *   ${states['sensor.temp']}            entity state (also `.state`)
 *   ${attr('sensor.temp', 'unit')}      entity attribute (alias state_attr)
 *   ${is_state('switch.pump', 'on')}    "true" / "false"
 *   ${if(cond, then, else)}             branches are expressions; a quoted
 *                                       branch may itself contain ${...}
 *   ${calc(expr)} ${calc(expr, 2)}      arithmetic: + - * / % and parentheses
 *   ${round(expr, 1)} ${fixed(expr, 2)} toFixed(N), defaults 0 and 2
 *   ${clamp(x, lo, hi)} ${min(a, b, ...)} ${max(a, b, ...)}
 *   ${timestamp('e')}                   relative time in hass.locale
 *   ${timestamp('e', 'time')}           absolute: 'time', 'date' or 'datetime'
 *   ${style_class('e', 'on:active', 'off:inactive')}
 *   ${raw(expr)}                        insert entity text without masking
 *
 * Text that comes from entities (states, attr, timestamp) is masked so it
 * cannot break Mermaid syntax; numeric results are inserted as they are.
 * An expression that does not parse is left in the content unchanged.
 */

export interface TemplateOptions {
  /** Number used when a numeric context meets a non-numeric value. */
  numericFallback?: number;
}

/** Text from an entity: masked on output unless passed through raw(). */
interface EntityText {
  entity: string;
}
type Value = string | number | boolean | EntityText;

type Node =
  | { t: "lit"; v: string | number }
  | { t: "state"; id: string }
  | { t: "call"; name: string; args: Node[] }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "neg"; e: Node };

const ARITY: Record<string, [number, number]> = {
  if: [2, 3],
  is_state: [2, 2],
  attr: [2, 2],
  state_attr: [2, 2],
  calc: [1, 2],
  round: [1, 2],
  fixed: [1, 2],
  clamp: [3, 3],
  min: [1, Infinity],
  max: [1, Infinity],
  timestamp: [1, 2],
  style_class: [1, Infinity],
  raw: [1, 1],
};

const COMPARISONS = [">=", "<=", "==", "!=", ">", "<"];

const ENTITY_CODES: Record<string, string> = {
  '"': "#quot;", "#": "#35;", "[": "#91;", "]": "#93;", "{": "#123;", "}": "#125;",
  "(": "#40;", ")": "#41;", "<": "#60;", ">": "#62;", "|": "#124;", ";": "#59;", ",": "#44;",
};

/** Mask characters that Mermaid would read as syntax. Commas only matter in sankey CSV. */
export function maskValue(text: string, sankey: boolean): string {
  const re = sankey ? /\r\n|[\r\n"#[\]{}()<>|;,]/g : /\r\n|[\r\n"#[\]{}()<>|;]/g;
  return text.replace(re, (ch) => ENTITY_CODES[ch] ?? " ");
}

/** True when the diagram (after optional front matter and %% comments) is a sankey. */
export function isSankey(content: string): boolean {
  const first = content
    .replace(/^\s*---\r?\n[\s\S]*?\r?\n---/, "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("%%"));
  return /^sankey/.test(first ?? "");
}

/** Parse one expression starting at `start`, followed by the closing "}". */
function parse(src: string, start: number): { node: Node; end: number } {
  let i = start;
  const NUMBER = /\d+(?:\.\d+)?|\.\d+/y;
  const IDENT = /[a-z_]+/y;
  const fail = (what: string): never => {
    throw new Error(`${what} at ${i}`);
  };
  const ws = (): void => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  const eat = (tok: string): boolean => {
    ws();
    if (!src.startsWith(tok, i)) return false;
    i += tok.length;
    return true;
  };
  const expect = (tok: string): void => {
    if (!eat(tok)) fail(`expected ${tok}`);
  };
  const sticky = (re: RegExp): string | null => {
    ws();
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) return null;
    i = re.lastIndex;
    return m[0];
  };
  const quoted = (): string | null => {
    ws();
    const q = src[i];
    if (q !== "'" && q !== '"') return null;
    const close = src.indexOf(q, i + 1);
    if (close < 0) fail("unterminated string");
    const v = src.slice(i + 1, close);
    i = close + 1;
    return v;
  };

  const comparison = (): Node => {
    const l = additive();
    ws();
    const op = COMPARISONS.find((o) => src.startsWith(o, i));
    if (!op) return l;
    i += op.length;
    return { t: "bin", op, l, r: additive() };
  };
  const binary = (ops: string, next: () => Node) => (): Node => {
    let l = next();
    for (;;) {
      ws();
      const op = src[i];
      if (!op || !ops.includes(op)) return l;
      i++;
      l = { t: "bin", op, l, r: next() };
    }
  };
  const unary = (): Node => {
    if (eat("-")) return { t: "neg", e: unary() };
    if (eat("+")) return unary();
    return primary();
  };
  const multiplicative = binary("*/%", unary);
  const additive = binary("+-", multiplicative);

  const primary = (): Node => {
    const s = quoted();
    if (s !== null) return { t: "lit", v: s };
    if (eat("(")) {
      const e = comparison();
      expect(")");
      return e;
    }
    const n = sticky(NUMBER);
    if (n !== null) return { t: "lit", v: parseFloat(n) };
    const name = sticky(IDENT) ?? fail("unexpected input");
    if (name === "states") {
      expect("[");
      const id = quoted() ?? fail("expected entity id");
      expect("]");
      if (/^\.state(?!\w)/.test(src.slice(i, i + 7))) i += 6;
      return { t: "state", id };
    }
    const arity = ARITY[name] ?? fail(`unknown function ${name}`);
    expect("(");
    const args: Node[] = [];
    if (!eat(")")) {
      do args.push(comparison());
      while (eat(","));
      expect(")");
    }
    if (args.length < arity[0] || args.length > arity[1]) fail(`wrong argument count for ${name}`);
    return { t: "call", name, args };
  };

  const node = comparison();
  expect("}");
  return { node, end: i };
}

export function renderTemplate(
  content: string,
  hass: HomeAssistant | undefined,
  options: TemplateOptions = {}
): string {
  if (!hass) return content;
  const fallback = options.numericFallback ?? 0;
  const sankey = isSankey(content);

  const getState = (entityId: string): string => hass.states[entityId]?.state ?? "unavailable";
  const getAttr = (entityId: string, attribute: string): string => {
    const val = hass.states[entityId]?.attributes[attribute];
    return val !== undefined ? String(val) : "unavailable";
  };

  const text = (v: Value): string => (typeof v === "object" ? v.entity : String(v));
  const num = (v: Value): number => {
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const n = parseFloat(text(v));
    return isNaN(n) ? fallback : n;
  };
  const digits = (v: Value): number => Math.min(100, Math.max(0, Math.trunc(num(v))));
  const truthy = (v: Value): boolean =>
    typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : text(v) !== "" && text(v) !== "false";

  const timestamp = (entityId: string, form?: string): string => {
    const entity = hass.states[entityId];
    if (!entity) return "unavailable";
    const changed = new Date(entity.last_changed);
    const lang = hass.locale?.language || hass.language || "en";
    if (form !== undefined) {
      const tf = hass.locale?.time_format;
      const hour12 = tf === "12" ? true : tf === "24" ? false : undefined;
      const time: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12 };
      const date: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
      const forms: Record<string, Intl.DateTimeFormatOptions> = { time, date, datetime: { ...date, ...time } };
      if (!forms[form]) throw new Error(`unknown timestamp form ${form}`);
      return changed.toLocaleString(lang, forms[form]);
    }
    // Narrow style keeps the pre-0.8 English output ("5m ago").
    const rtf = new Intl.RelativeTimeFormat(lang, { style: "narrow", numeric: "always" });
    const sec = Math.floor((Date.now() - changed.getTime()) / 1000);
    if (Math.abs(sec) < 60) return rtf.format(-sec, "second");
    const min = Math.trunc(sec / 60);
    if (Math.abs(min) < 60) return rtf.format(-min, "minute");
    const hour = Math.trunc(min / 60);
    if (Math.abs(hour) < 24) return rtf.format(-hour, "hour");
    return rtf.format(-Math.trunc(hour / 24), "day");
  };

  const evaluate = (node: Node): Value => {
    switch (node.t) {
      case "lit":
        return node.v;
      case "state":
        return { entity: getState(node.id) };
      case "neg":
        return -num(evaluate(node.e));
      case "bin": {
        const l = evaluate(node.l);
        const r = evaluate(node.r);
        switch (node.op) {
          case "+": return num(l) + num(r);
          case "-": return num(l) - num(r);
          case "*": return num(l) * num(r);
          case "/": return num(l) / num(r);
          case "%": return num(l) % num(r);
          case ">": return num(l) > num(r);
          case "<": return num(l) < num(r);
          case ">=": return num(l) >= num(r);
          case "<=": return num(l) <= num(r);
        }
        // == and != compare numbers when either side is a number, text otherwise
        const numeric = typeof l === "number" || typeof r === "number";
        const equal = numeric ? num(l) === num(r) : text(l) === text(r);
        return node.op === "==" ? equal : !equal;
      }
      case "call":
        return call(node.name, node.args);
    }
  };

  const call = (name: string, args: Node[]): Value => {
    const arg = (n: number): Value => evaluate(args[n]);
    switch (name) {
      case "is_state":
        return getState(text(arg(0))) === text(arg(1));
      case "attr":
      case "state_attr":
        return { entity: getAttr(text(arg(0)), text(arg(1))) };
      case "timestamp":
        return { entity: timestamp(text(arg(0)), args[1] ? text(arg(1)) : undefined) };
      case "if": {
        const branch = truthy(arg(0)) ? args[1] : args[2];
        if (!branch) return "";
        // A quoted branch may contain its own ${...} expressions.
        return branch.t === "lit" && typeof branch.v === "string" && branch.v.includes("${")
          ? render(branch.v)
          : evaluate(branch);
      }
      case "calc":
        return args[1] ? num(arg(0)).toFixed(digits(arg(1))) : num(arg(0));
      case "round":
        return num(arg(0)).toFixed(args[1] ? digits(arg(1)) : 0);
      case "fixed":
        return num(arg(0)).toFixed(args[1] ? digits(arg(1)) : 2);
      case "clamp":
        return Math.min(Math.max(num(arg(0)), num(arg(1))), num(arg(2)));
      case "min":
        return Math.min(...args.map((a) => num(evaluate(a))));
      case "max":
        return Math.max(...args.map((a) => num(evaluate(a))));
      case "style_class": {
        const state = getState(text(arg(0)));
        const pairs = args.slice(1).map((a) => text(evaluate(a)).split(":"));
        const hit = pairs.find(([s]) => s === state) ?? pairs[pairs.length - 1];
        return hit?.[1] ?? "default";
      }
      case "raw":
        return text(arg(0));
    }
    throw new Error(`unknown function ${name}`);
  };

  const output = (v: Value): string => (typeof v === "object" ? maskValue(v.entity, sankey) : text(v));

  const render = (src: string): string => {
    let out = "";
    let i = 0;
    for (;;) {
      const at = src.indexOf("${", i);
      if (at < 0) return out + src.slice(i);
      out += src.slice(i, at);
      try {
        const { node, end } = parse(src, at + 2);
        out += output(evaluate(node));
        i = end;
      } catch {
        out += "${";
        i = at + 2;
      }
    }
  };

  return render(content);
}

/**
 * Extracts all entity IDs referenced in template expressions.
 * Used for efficient change detection — only re-render when watched entities change.
 */
export function extractReferencedEntities(content: string): string[] {
  const entities = new Set<string>();

  // Match all entity_id patterns inside template expressions
  const patterns = [
    /states\[['"]([^'"]+)['"]\]/g,
    /is_state\(['"]([^'"]+)['"]/g,
    /(?:attr|state_attr)\(['"]([^'"]+)['"]/g,
    /style_class\(['"]([^'"]+)['"]/g,
    /timestamp\(['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      entities.add(match[1]);
    }
  }

  return [...entities];
}
