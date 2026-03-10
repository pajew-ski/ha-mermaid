import type { HomeAssistant } from "./types";

/**
 * Resolves template expressions in Mermaid diagram content.
 * All expressions use ${...} syntax and are evaluated against hass.states.
 *
 * Supported syntax:
 *
 *   STATE ACCESS:
 *     ${states['sensor.temperature']}              → entity state value
 *     ${states['sensor.temperature'].state}         → entity state value (explicit)
 *     ${attr('sensor.temperature', 'unit')}         → entity attribute
 *     ${state_attr('sensor.temp', 'unit')}          → alias for attr()
 *
 *   CONDITIONALS:
 *     ${is_state('switch.pump', 'on')}              → "true" or "false"
 *     ${if(is_state('switch.pump', 'on'), '🟢', '🔴')}  → conditional output
 *     ${if(states['sensor.temp'] > 25, 'Hot', 'OK')}     → numeric comparison
 *
 *   MATH:
 *     ${calc(states['sensor.temp'] * 1.8 + 32)}    → math expression result
 *     ${round(states['sensor.temp'], 1)}            → round to N decimals
 *
 *   FORMATTING:
 *     ${fixed(states['sensor.price'], 2)}           → toFixed(N)
 *     ${timestamp('sensor.last_motion')}            → relative time ("5 min ago")
 *
 *   STYLE CLASSES (for Mermaid node styling):
 *     ${style_class('switch.pump', 'on:active', 'off:inactive')}
 *       → returns the CSS class name based on entity state
 *
 * Unknown entities resolve to "unavailable".
 */
export function renderTemplate(
  content: string,
  hass: HomeAssistant | undefined
): string {
  if (!hass) return content;

  let result = content;

  // Helper: get entity state string
  const getState = (entityId: string): string => {
    const entity = hass.states[entityId];
    return entity ? entity.state : "unavailable";
  };

  // Helper: get entity attribute
  const getAttr = (entityId: string, attribute: string): string => {
    const entity = hass.states[entityId];
    if (!entity) return "unavailable";
    const val = entity.attributes[attribute];
    return val !== undefined ? String(val) : "unavailable";
  };

  // Helper: parse a numeric state safely
  const numState = (entityId: string): number => {
    const val = parseFloat(getState(entityId));
    return isNaN(val) ? 0 : val;
  };

  // 1) ${if(is_state('entity', 'value'), 'true_result', 'false_result')}
  result = result.replace(
    /\$\{if\(is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\),\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]\)\}/g,
    (_match, entityId: string, stateVal: string, trueResult: string, falseResult: string) => {
      return getState(entityId) === stateVal ? trueResult : falseResult;
    }
  );

  // 2) ${if(states['entity'] > N, 'true_result', 'false_result')} — numeric comparison
  result = result.replace(
    /\$\{if\(states\[['"]([^'"]+)['"]\]\s*([><=!]+)\s*([\d.]+),\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]\)\}/g,
    (_match, entityId: string, op: string, threshold: string, trueResult: string, falseResult: string) => {
      const val = numState(entityId);
      const num = parseFloat(threshold);
      let cond = false;
      switch (op) {
        case ">": cond = val > num; break;
        case "<": cond = val < num; break;
        case ">=": cond = val >= num; break;
        case "<=": cond = val <= num; break;
        case "==": cond = val === num; break;
        case "!=": cond = val !== num; break;
      }
      return cond ? trueResult : falseResult;
    }
  );

  // 3) ${is_state('entity_id', 'value')} → "true" or "false"
  result = result.replace(
    /\$\{is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\}/g,
    (_match, entityId: string, stateVal: string) => {
      return getState(entityId) === stateVal ? "true" : "false";
    }
  );

  // 4) ${style_class('entity', 'state1:class1', 'state2:class2', ...)}
  result = result.replace(
    /\$\{style_class\(['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])*\)\}/g,
    (match, entityId: string) => {
      const state = getState(entityId);
      // Extract all 'state:class' pairs from the full match
      const pairs = [...match.matchAll(/['"](\w+):(\w+)['"]/g)];
      // Skip first match (entity_id doesn't have a colon pattern we want)
      for (const pair of pairs) {
        if (pair[1] === state) return pair[2];
      }
      return pairs.length > 0 ? pairs[pairs.length - 1][2] : "default";
    }
  );

  // 5) ${calc(states['entity'] * 1.8 + 32)} — safe math expression
  result = result.replace(
    /\$\{calc\(([^}]+)\)\}/g,
    (_match, expr: string) => {
      try {
        // Replace states['entity'] references with numeric values
        const resolved = expr.replace(
          /states\[['"]([^'"]+)['"]\]/g,
          (_m: string, eid: string) => String(numState(eid))
        );
        // Safe math evaluation: only allow numbers, operators, parentheses, spaces
        if (!/^[\d\s+\-*/.()]+$/.test(resolved)) return "error";
        // eslint-disable-next-line no-new-func
        const result = new Function(`return (${resolved})`)();
        return String(result);
      } catch {
        return "error";
      }
    }
  );

  // 6) ${round(states['entity'], N)}
  result = result.replace(
    /\$\{round\(states\[['"]([^'"]+)['"]\],?\s*(\d+)?\)\}/g,
    (_match, entityId: string, decimals: string) => {
      const val = numState(entityId);
      const dec = decimals ? parseInt(decimals, 10) : 0;
      return val.toFixed(dec);
    }
  );

  // 7) ${fixed(states['entity'], N)}
  result = result.replace(
    /\$\{fixed\(states\[['"]([^'"]+)['"]\],?\s*(\d+)?\)\}/g,
    (_match, entityId: string, decimals: string) => {
      const val = numState(entityId);
      const dec = decimals ? parseInt(decimals, 10) : 2;
      return val.toFixed(dec);
    }
  );

  // 8) ${timestamp('entity')} → relative time since last_changed
  result = result.replace(
    /\$\{timestamp\(['"]([^'"]+)['"]\)\}/g,
    (_match, entityId: string) => {
      const entity = hass.states[entityId];
      if (!entity) return "unavailable";
      const changed = new Date(entity.last_changed);
      const now = new Date();
      const diffMs = now.getTime() - changed.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}d ago`;
    }
  );

  // 9) ${attr('entity_id', 'attribute')} or ${state_attr('entity_id', 'attribute')}
  result = result.replace(
    /\$\{(?:attr|state_attr)\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\}/g,
    (_match, entityId: string, attribute: string) => getAttr(entityId, attribute)
  );

  // 10) ${states['entity_id']} or ${states['entity_id'].state} — basic state access (last, catches remaining)
  result = result.replace(
    /\$\{states\[['"]([^'"]+)['"]\](?:\.state)?\}/g,
    (_match, entityId: string) => getState(entityId)
  );

  return result;
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
    /round\(states\[['"]([^'"]+)['"]\]/g,
    /fixed\(states\[['"]([^'"]+)['"]\]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      entities.add(match[1]);
    }
  }

  return [...entities];
}
