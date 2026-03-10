/**
 * Parse any CSS color (hex, rgb, named) into [r, g, b] values.
 */
function parseColor(color: string): [number, number, number] {
  // Use a temporary element to resolve any CSS color format
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = color;
  const resolved = ctx.fillStyle; // always returns #rrggbb or #rrggbbaa

  if (resolved.startsWith("#")) {
    const hex = resolved.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return [128, 128, 128]; // fallback gray
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
 * Generate a palette of N distinct colors based on a primary color.
 * Uses golden-angle hue rotation for maximum visual distinction,
 * with alternating lightness for additional contrast.
 */
function generatePalette(primaryHex: string, count: number): string[] {
  const [r, g, b] = parseColor(primaryHex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const colors: string[] = [];
  const goldenAngle = 137.508; // degrees — maximizes hue spread

  for (let i = 0; i < count; i++) {
    const hue = h + i * goldenAngle;
    // Alternate lightness: even slots slightly lighter, odd slots slightly darker
    const lightness = Math.max(0.25, Math.min(0.65, l + (i % 2 === 0 ? 0 : -0.1)));
    // Keep saturation vibrant
    const saturation = Math.max(0.4, Math.min(0.85, s));
    colors.push(hslToHex(hue, saturation, lightness));
  }
  return colors;
}

/**
 * Determine appropriate text color (light or dark) for a given background.
 * Uses WCAG relative luminance formula.
 */
function contrastTextColor(bgHex: string): string {
  const [r, g, b] = parseColor(bgHex);
  // Relative luminance per WCAG 2.0
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

/**
 * Maps Home Assistant CSS theme variables to Mermaid themeVariables.
 * Reads computed styles from the card element to pick up the active HA theme.
 */
export function getHAThemeVariables(
  element: HTMLElement
): Record<string, string> {
  const cs = getComputedStyle(element);
  const get = (prop: string, fallback: string): string =>
    cs.getPropertyValue(prop).trim() || fallback;

  const primary = get("--primary-color", "#03a9f4");
  const primaryText = get("--primary-text-color", "#212121");
  const secondaryText = get("--secondary-text-color", "#727272");
  const accent = get("--accent-color", "#ff9800");
  const cardBg = get("--ha-card-background", get("--card-background-color", "#ffffff"));
  const primaryBg = get("--primary-background-color", "#fafafa");
  const secondaryBg = get("--secondary-background-color", "#e5e5e5");
  const divider = get("--divider-color", "#e0e0e0");
  const textPrimary = get("--primary-text-color", "#212121");
  const error = get("--error-color", "#db4437");
  const success = get("--success-color", "#43a047");
  const warning = get("--warning-color", "#ffa600");
  const info = get("--info-color", "#039be5");

  // Generate 12 visually distinct pie colors from the primary color
  const pieColors = generatePalette(primary, 12);

  // For mindmap: ensure text contrasts against node backgrounds
  const primaryContrastText = contrastTextColor(primary);
  const accentContrastText = contrastTextColor(accent);
  const secondaryBgContrastText = contrastTextColor(secondaryBg);

  return {
    primaryColor: primary,
    primaryTextColor: primaryContrastText,
    primaryBorderColor: divider,
    secondaryColor: accent,
    secondaryTextColor: accentContrastText,
    secondaryBorderColor: divider,
    tertiaryColor: secondaryBg,
    tertiaryTextColor: secondaryBgContrastText,
    tertiaryBorderColor: divider,
    lineColor: secondaryText,
    textColor: textPrimary,
    mainBkg: cardBg,
    nodeBkg: primaryBg,
    nodeBorder: primary,
    clusterBkg: secondaryBg,
    clusterBorder: divider,
    titleColor: primaryText,
    edgeLabelBackground: cardBg,
    background: cardBg,

    // Sequence diagram
    actorBkg: primaryBg,
    actorBorder: primary,
    actorTextColor: primaryText,
    actorLineColor: secondaryText,
    signalColor: primaryText,
    signalTextColor: primaryText,
    labelBoxBkgColor: primaryBg,
    labelBoxBorderColor: divider,
    labelTextColor: primaryText,
    loopTextColor: primaryText,
    noteBkgColor: secondaryBg,
    noteBorderColor: divider,
    noteTextColor: primaryText,
    activationBkgColor: primaryBg,
    activationBorderColor: primary,
    sequenceNumberColor: cardBg,

    // Gantt
    sectionBkgColor: primaryBg,
    altSectionBkgColor: secondaryBg,
    sectionBkgColor2: primaryBg,
    taskBkgColor: primary,
    taskTextColor: primaryContrastText,
    taskTextLightColor: primaryContrastText,
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

    // Pie — 12 distinct colors derived from primary via hue rotation
    pie1: pieColors[0],
    pie2: pieColors[1],
    pie3: pieColors[2],
    pie4: pieColors[3],
    pie5: pieColors[4],
    pie6: pieColors[5],
    pie7: pieColors[6],
    pie8: pieColors[7],
    pie9: pieColors[8],
    pie10: pieColors[9],
    pie11: pieColors[10],
    pie12: pieColors[11],
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

    // Class diagram
    classText: primaryText,

    // Fonts
    fontFamily: get("--ha-card-header-font-family",
      get("--paper-font-common-base_-_font-family",
        "'Roboto', 'Noto', sans-serif")),
    fontSize: "14px",
  };
}

/**
 * Determines the best Mermaid base theme given HA dark mode state.
 */
export function getMermaidBaseTheme(darkMode: boolean): "dark" | "default" {
  return darkMode ? "dark" : "default";
}
