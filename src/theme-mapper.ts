/**
 * Parse any CSS color (hex, rgb[a], hsl, named, transparent) into
 * [r, g, b, a]. Returns null if the color cannot be resolved.
 */
export function parseColor(
  color: string
): [number, number, number, number] | null {
  if (!color) return null;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  const resolved = String(ctx.fillStyle);

  // Opaque colors resolve to #rrggbb
  if (resolved.startsWith("#") && resolved.length >= 7) {
    return [
      parseInt(resolved.slice(1, 3), 16),
      parseInt(resolved.slice(3, 5), 16),
      parseInt(resolved.slice(5, 7), 16),
      resolved.length === 9 ? parseInt(resolved.slice(7, 9), 16) / 255 : 1,
    ];
  }
  // Colors with alpha resolve to rgba(r, g, b, a)
  const m = resolved.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/
  );
  if (m) {
    return [
      Math.round(parseFloat(m[1])),
      Math.round(parseFloat(m[2])),
      Math.round(parseFloat(m[3])),
      m[4] !== undefined ? parseFloat(m[4]) : 1,
    ];
  }
  return null;
}

/**
 * WCAG relative luminance (0 = black, 1 = white).
 */
export function relativeLuminance(color: string): number | null {
  const rgb = parseColor(color);
  if (!rgb) return null;
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/**
 * WCAG contrast ratio between two colors (1..21). Null if either is unparsable.
 */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * True if the color is opaque enough to act as a background and is dark.
 * Returns null when the color is transparent or unparsable.
 */
export function isDarkColor(color: string): boolean | null {
  const rgb = parseColor(color);
  if (!rgb || rgb[3] < 0.5) return null;
  const lum = relativeLuminance(color);
  return lum !== null && lum < 0.35;
}

/**
 * Convert RGB to HSL. Returns [h (0-360), s (0-1), l (0-1)].
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

/**
 * Convert HSL to hex color string.
 */
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Normalize any CSS color to #rrggbb. Semi-transparent colors are composited
 * over `over` (HA uses e.g. `rgba(0,0,0,.12)` for dividers). Falls back to
 * the given default if the color cannot be parsed.
 */
function toHex(color: string, fallback: string, over?: string): string {
  const rgb = parseColor(color);
  if (!rgb) return fallback;
  let [r, g, b] = rgb;
  const a = rgb[3];
  if (a < 1) {
    const bg = (over && parseColor(over)) || [255, 255, 255, 1];
    r = Math.round(r * a + bg[0] * (1 - a));
    g = Math.round(g * a + bg[1] * (1 - a));
    b = Math.round(b * a + bg[2] * (1 - a));
  }
  const h = (v: number) => v.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

interface PaletteOptions {
  /** Lightness range the generated colors are clamped to (0-1). */
  minL: number;
  maxL: number;
  /** Alternate lightness between even/odd slots by this amount. */
  alternate?: number;
}

/**
 * Generate a palette of N distinct colors based on a primary color.
 * Uses golden-angle hue rotation for maximum visual distinction.
 */
function generatePalette(
  primaryHex: string,
  count: number,
  opts: PaletteOptions
): string[] {
  const rgb = parseColor(primaryHex) ?? [3, 169, 244, 1];
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const colors: string[] = [];
  const goldenAngle = 137.508; // degrees — maximizes hue spread
  const alt = opts.alternate ?? 0;

  for (let i = 0; i < count; i++) {
    const hue = h + i * goldenAngle;
    const lightness = Math.max(
      opts.minL,
      Math.min(opts.maxL, l + (i % 2 === 0 ? 0 : -alt))
    );
    // Keep saturation vibrant even for gray-ish primaries
    const saturation = Math.max(0.4, Math.min(0.85, s));
    colors.push(hslToHex(hue, saturation, lightness));
  }
  return colors;
}

/**
 * Determine the text color (light or dark) with the best WCAG contrast
 * against the given background.
 */
export function contrastTextColor(bg: string): string {
  const light = "#ffffff";
  const dark = "#1a1a1a";
  const toLight = contrastRatio(bg, light);
  const toDark = contrastRatio(bg, dark);
  if (toLight === null || toDark === null) return dark;
  return toLight >= toDark ? light : dark;
}

/**
 * Pick the light or dark text color that stays most readable across all
 * given backgrounds (maximizes the worst-case contrast).
 */
function bestTextColorFor(backgrounds: string[]): string {
  const worst = (fg: string): number =>
    Math.min(...backgrounds.map((bg) => contrastRatio(bg, fg) ?? 0));
  return worst("#ffffff") >= worst("#1a1a1a") ? "#ffffff" : "#1a1a1a";
}

export interface HAMermaidTheme {
  /** Mermaid `themeVariables` for the `base` theme. */
  themeVariables: Record<string, string | boolean>;
  /** Extra CSS injected via Mermaid's `themeCSS` option. */
  themeCSS: string;
  /** Whether the card renders on a dark background. */
  darkMode: boolean;
}

/**
 * Maps Home Assistant CSS theme variables to a Mermaid theme.
 * Reads computed styles from the card element to pick up the active HA theme.
 *
 * @param element  The card element (for getComputedStyle).
 * @param darkModeHint  HA's `hass.themes.darkMode`; used when the card
 *   background is transparent or cannot be parsed.
 */
export function getHATheme(
  element: HTMLElement,
  darkModeHint = false
): HAMermaidTheme {
  const cs = getComputedStyle(element);
  const get = (prop: string, fallback: string): string =>
    cs.getPropertyValue(prop).trim() || fallback;

  const rawCardBg = get("--ha-card-background", get("--card-background-color", ""));
  const rawPrimaryBg = get("--primary-background-color", "");

  // Decide dark mode from the actual surface the diagram sits on. Cards with
  // a (semi-)transparent background fall back to the page background, then
  // to HA's own darkMode flag.
  let darkMode = isDarkColor(rawCardBg);
  let surface = rawCardBg;
  if (darkMode === null) {
    darkMode = isDarkColor(rawPrimaryBg);
    surface = rawPrimaryBg;
  }
  if (darkMode === null) {
    darkMode = darkModeHint;
    surface = darkMode ? "#1c1c1c" : "#ffffff";
  }

  const cardBg = toHex(surface, darkMode ? "#1c1c1c" : "#ffffff");
  const primaryBg = toHex(rawPrimaryBg, darkMode ? "#111111" : "#fafafa", cardBg);
  const secondaryBg = toHex(
    get("--secondary-background-color", ""),
    darkMode ? "#202020" : "#e5e5e5",
    cardBg
  );
  const primary = toHex(get("--primary-color", ""), "#03a9f4", cardBg);
  const accent = toHex(get("--accent-color", ""), "#ff9800", cardBg);
  const divider = toHex(get("--divider-color", ""), darkMode ? "#373737" : "#e0e0e0", cardBg);
  const error = toHex(get("--error-color", ""), "#db4437", cardBg);
  const success = toHex(get("--success-color", ""), "#43a047", cardBg);
  const warning = toHex(get("--warning-color", ""), "#ffa600", cardBg);

  // Text colors: take HA's, but never accept one that is unreadable on the
  // surface the diagram is drawn on (misconfigured or transparent themes).
  const fallbackText = darkMode ? "#e1e1e1" : "#212121";
  const fallbackSecondary = darkMode ? "#9b9b9b" : "#727272";
  let primaryText = toHex(get("--primary-text-color", ""), fallbackText, cardBg);
  let secondaryText = toHex(get("--secondary-text-color", ""), fallbackSecondary, cardBg);
  if ((contrastRatio(primaryText, cardBg) ?? 0) < 3) primaryText = fallbackText;
  if ((contrastRatio(secondaryText, cardBg) ?? 0) < 2) secondaryText = fallbackSecondary;

  // Node surfaces: a subtle step away from the card background so that
  // shapes remain visible without relying on borders alone.
  const nodeBg = primaryBg !== cardBg ? primaryBg : secondaryBg;

  // Pie: 12 distinct colors derived from the primary hue
  const pieColors = generatePalette(primary, 12, {
    minL: 0.3,
    maxL: 0.6,
    alternate: 0.1,
  });

  // Section colors (mindmap, timeline, kanban): 12 distinct, medium-lightness
  // fills so both light and dark text variants stay readable. Mermaid's base
  // theme would otherwise derive these from primaryColor and darken them by
  // 25 % — which turns typical HA primaries (e.g. teal) nearly black.
  const sectionColors = generatePalette(primary, 12, {
    minL: darkMode ? 0.42 : 0.38,
    maxL: darkMode ? 0.6 : 0.55,
  });
  // Section 0 of the scale is only ever used for the root node, and there it
  // is overridden by git0 — so keep the theme's primary color for the root.
  sectionColors[0] = primary;
  const sectionLabels = sectionColors.map(contrastTextColor);

  // Gantt draws done/active/critical task labels in one shared color.
  const statusText = bestTextColorFor([success, accent, error]);

  const vars: Record<string, string | boolean> = {
    darkMode,

    primaryColor: primary,
    primaryTextColor: primaryText,
    primaryBorderColor: divider,
    secondaryColor: accent,
    secondaryTextColor: secondaryText,
    secondaryBorderColor: divider,
    tertiaryColor: secondaryBg,
    tertiaryTextColor: primaryText,
    tertiaryBorderColor: divider,
    lineColor: secondaryText,
    arrowheadColor: secondaryText,
    textColor: primaryText,
    mainBkg: nodeBg,
    nodeBkg: nodeBg,
    nodeBorder: primary,
    nodeTextColor: primaryText,
    clusterBkg: secondaryBg,
    clusterBorder: divider,
    titleColor: primaryText,
    edgeLabelBackground: cardBg,
    background: cardBg,
    rowOdd: cardBg,
    rowEven: secondaryBg,

    // Sequence diagram
    actorBkg: nodeBg,
    actorBorder: primary,
    actorTextColor: primaryText,
    actorLineColor: secondaryText,
    signalColor: primaryText,
    signalTextColor: primaryText,
    labelBoxBkgColor: nodeBg,
    labelBoxBorderColor: divider,
    labelTextColor: primaryText,
    loopTextColor: primaryText,
    noteBkgColor: secondaryBg,
    noteBorderColor: divider,
    noteTextColor: primaryText,
    activationBkgColor: nodeBg,
    activationBorderColor: primary,
    sequenceNumberColor: cardBg,

    // Gantt
    sectionBkgColor: nodeBg,
    altSectionBkgColor: secondaryBg,
    sectionBkgColor2: nodeBg,
    excludeBkgColor: secondaryBg,
    taskBkgColor: primary,
    taskTextColor: contrastTextColor(primary),
    taskTextLightColor: contrastTextColor(primary),
    taskTextDarkColor: statusText,
    taskTextOutsideColor: primaryText,
    taskBorderColor: primary,
    activeTaskBkgColor: accent,
    activeTaskBorderColor: accent,
    doneTaskBkgColor: success,
    doneTaskBorderColor: success,
    critBkgColor: error,
    critBorderColor: error,
    todayLineColor: warning,
    gridColor: divider,

    // State diagram
    labelColor: primaryText,
    altBackground: secondaryBg,
    stateBkg: nodeBg,
    stateLabelColor: primaryText,
    compositeBackground: secondaryBg,
    compositeTitleBackground: secondaryBg,

    // Pie
    pieTitleTextSize: "16px",
    pieTitleTextColor: primaryText,
    pieSectionTextSize: "14px",
    pieSectionTextColor: "#ffffff",
    pieLegendTextSize: "14px",
    pieLegendTextColor: primaryText,
    pieStrokeColor: cardBg,
    pieStrokeWidth: "2px",
    pieOuterStrokeWidth: "1px",
    pieOuterStrokeColor: divider,
    pieOpacity: "1",

    // Class / ER diagram
    classText: primaryText,
    attributeBackgroundColorOdd: cardBg,
    attributeBackgroundColorEven: secondaryBg,

    // Fonts
    fontFamily: get("--ha-card-header-font-family",
      get("--paper-font-common-base_-_font-family",
        "'Roboto', 'Noto', sans-serif")),
    fontSize: "14px",
  };

  for (let i = 0; i < 12; i++) {
    vars[`pie${i + 1}`] = pieColors[i];
    vars[`cScale${i}`] = sectionColors[i];
    vars[`cScaleLabel${i}`] = sectionLabels[i];
    vars[`cScaleInv${i}`] = sectionLabels[i];
  }
  // Git graph / mindmap root: git0 is the root node fill.
  for (let i = 0; i < 8; i++) {
    vars[`git${i}`] = sectionColors[i];
    vars[`gitInv${i}`] = sectionLabels[i];
    vars[`gitBranchLabel${i}`] = sectionLabels[i];
  }

  // Mermaid colors <text> per section but leaves HTML labels (<span>) on the
  // generic text color, and maps `.section-2 span` to the root label color.
  // Inject explicit per-section label colors for both label flavours.
  const css: string[] = [];
  css.push(
    `.section-root text, .section--1 text { fill: ${sectionLabels[0]}; }`,
    `.section-root span, .section-root div, .section-root .nodeLabel,` +
      ` .section--1 span, .section--1 div, .section--1 .nodeLabel` +
      ` { color: ${sectionLabels[0]}; }`
  );
  for (let i = 0; i < 11; i++) {
    const label = sectionLabels[i + 1];
    css.push(
      `.section-${i} text { fill: ${label}; }`,
      `.section-${i} span, .section-${i} div, .section-${i} .nodeLabel { color: ${label}; }`
    );
  }

  // Timeline: the axis takes the last section's label color and the arrow
  // head / task lines are hard-coded black or gray in Mermaid.
  css.push(
    `.lineWrapper line, .task-line { stroke: ${secondaryText}; }`,
    `marker#arrowhead path { fill: ${secondaryText}; }`
  );

  return { themeVariables: vars, themeCSS: css.join("\n"), darkMode };
}
