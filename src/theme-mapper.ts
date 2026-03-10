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

  return {
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
    taskTextColor: "#ffffff",
    taskTextLightColor: "#ffffff",
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

    // Pie
    pie1: primary,
    pie2: accent,
    pie3: success,
    pie4: info,
    pie5: warning,
    pie6: error,
    pie7: secondaryText,
    pie8: divider,
    pieTitleTextSize: "16px",
    pieTitleTextColor: primaryText,
    pieSectionTextSize: "14px",
    pieSectionTextColor: "#ffffff",
    pieLegendTextSize: "14px",
    pieLegendTextColor: primaryText,
    pieStrokeColor: divider,
    pieStrokeWidth: "1px",
    pieOuterStrokeWidth: "1px",
    pieOuterStrokeColor: divider,
    pieOpacity: "0.9",

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
