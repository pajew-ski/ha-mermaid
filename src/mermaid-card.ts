import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import mermaid from "mermaid";
import type { MermaidCardConfig, HomeAssistant } from "./types";
import { getHAThemeVariables, getMermaidBaseTheme } from "./theme-mapper";
import { renderTemplate } from "./template-renderer";
import { cardStyles } from "./styles";
import "./editor";

const CARD_VERSION = "1.0.0";

/* eslint-disable no-console */
console.info(
  `%c  HA-MERMAID  %c v${CARD_VERSION} `,
  "color: white; background: #03a9f4; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: #03a9f4; background: #e3f2fd; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

let renderCounter = 0;

class MermaidCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: MermaidCardConfig;
  @state() private _svgContent = "";
  @state() private _error = "";
  @state() private _loading = true;

  private _lastRenderedContent = "";
  private _lastDarkMode: boolean | null = null;

  static styles = cardStyles;

  static getConfigElement(): HTMLElement {
    return document.createElement("mermaid-card-editor");
  }

  static getStubConfig(): MermaidCardConfig {
    return {
      type: "custom:mermaid-card",
      content: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]`,
    };
  }

  setConfig(config: MermaidCardConfig): void {
    if (!config.content) {
      throw new Error("Please define 'content' with a Mermaid diagram.");
    }
    this._config = config;
    // Force re-render when config changes
    this._lastRenderedContent = "";
  }

  getCardSize(): number {
    return this._config?.card_size || 4;
  }

  updated(changedProps: Map<string, unknown>): void {
    super.updated(changedProps);
    this._renderDiagram();
  }

  private async _renderDiagram(): Promise<void> {
    if (!this._config || !this.shadowRoot) return;

    const resolvedContent = renderTemplate(this._config.content, this.hass);
    const darkMode = this.hass?.themes?.darkMode ?? false;

    // Skip if nothing changed
    if (
      resolvedContent === this._lastRenderedContent &&
      darkMode === this._lastDarkMode
    ) {
      return;
    }

    this._lastRenderedContent = resolvedContent;
    this._lastDarkMode = darkMode;
    this._loading = true;
    this._error = "";

    try {
      const container = this.shadowRoot.querySelector(".mermaid-container");
      if (!container) return;

      const useAutoTheme =
        !this._config.theme || this._config.theme === "auto";

      const mermaidConfig: Record<string, unknown> = {
        startOnLoad: false,
        securityLevel: "loose",
        theme: useAutoTheme
          ? "base"
          : this._config.theme,
        fontFamily: "var(--paper-font-common-base_-_font-family, 'Roboto', 'Noto', sans-serif)",
      };

      if (useAutoTheme) {
        mermaidConfig.themeVariables = getHAThemeVariables(this);
      }

      mermaid.initialize(mermaidConfig);

      const id = `mermaid-${++renderCounter}`;
      const { svg } = await mermaid.render(id, resolvedContent);

      this._svgContent = svg;
      this._loading = false;
    } catch (err) {
      this._loading = false;
      const message =
        err instanceof Error ? err.message : String(err);
      // Clean up Mermaid's verbose error messages
      this._error = message
        .replace(/Syntax error in.*\n?/g, "")
        .replace(/Parse error on line.*\n?/g, "")
        .trim() || "Failed to render diagram. Check your Mermaid syntax.";
      this._svgContent = "";
    }
  }

  protected render() {
    if (!this._config) return nothing;

    return html`
      <ha-card>
        ${this._config.title
          ? html`<div class="card-header">${this._config.title}</div>`
          : nothing}
        ${this._loading
          ? html`<div class="mermaid-loading">Rendering diagram…</div>`
          : this._error
            ? html`<div class="mermaid-error">${this._error}</div>`
            : this._svgContent
              ? html`<div
                  class="mermaid-container"
                  .innerHTML=${this._svgContent}
                ></div>`
              : html`<div class="mermaid-empty">
                  No diagram content defined.
                </div>`}
      </ha-card>
    `;
  }
}

customElements.define("mermaid-card", MermaidCard);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "mermaid-card",
  name: "Mermaid Diagram Card",
  description: "Render Mermaid diagrams with Home Assistant theme integration",
  preview: true,
  documentationURL: "https://github.com/pajew-ski/ha-mermaid",
});
