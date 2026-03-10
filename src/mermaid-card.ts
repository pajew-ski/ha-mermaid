import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import mermaid from "mermaid";
import type { MermaidCardConfig, HomeAssistant } from "./types";
import { getHAThemeVariables } from "./theme-mapper";
import { renderTemplate, extractReferencedEntities } from "./template-renderer";
import { cardStyles } from "./styles";
import "./editor";

const CARD_VERSION = "1.1.0";

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
  private _watchedEntities: string[] = [];
  private _lastEntityStates: Record<string, string> = {};
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _intervalTimer: ReturnType<typeof setInterval> | null = null;

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

    // Auto-detect entities from templates + merge with explicit list
    const autoDetected = extractReferencedEntities(config.content);
    const explicit = config.entities || [];
    this._watchedEntities = [...new Set([...autoDetected, ...explicit])];

    // Force re-render
    this._lastRenderedContent = "";
    this._lastEntityStates = {};

    // Set up interval-based updates if configured
    this._clearInterval();
    if (config.update_interval && config.update_interval > 0) {
      this._intervalTimer = setInterval(() => {
        this._lastRenderedContent = "";
        this._scheduleRender();
      }, config.update_interval * 1000);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearDebounce();
    this._clearInterval();
  }

  private _clearDebounce(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  private _clearInterval(): void {
    if (this._intervalTimer) {
      clearInterval(this._intervalTimer);
      this._intervalTimer = null;
    }
  }

  getCardSize(): number {
    return this._config?.card_size || 4;
  }

  /**
   * Only re-render when watched entities actually change.
   * Compares state + last_changed to catch all relevant updates.
   */
  private _hasRelevantChanges(): boolean {
    if (!this.hass || this._watchedEntities.length === 0) return true;

    let changed = false;
    for (const entityId of this._watchedEntities) {
      const entity = this.hass.states[entityId];
      const current = entity
        ? `${entity.state}|${entity.last_changed}`
        : "unavailable";
      if (this._lastEntityStates[entityId] !== current) {
        changed = true;
      }
      this._lastEntityStates[entityId] = current;
    }
    return changed;
  }

  updated(changedProps: Map<string, unknown>): void {
    super.updated(changedProps);

    // When hass changes, only re-render if watched entities changed
    if (changedProps.has("hass") && this._watchedEntities.length > 0) {
      if (!this._hasRelevantChanges()) return;
    }

    this._scheduleRender();
  }

  /**
   * Debounce rapid state changes (multiple sensors updating at once).
   */
  private _scheduleRender(): void {
    this._clearDebounce();
    this._debounceTimer = setTimeout(() => this._renderDiagram(), 100);
  }

  private async _renderDiagram(): Promise<void> {
    if (!this._config || !this.shadowRoot) return;

    const resolvedContent = renderTemplate(this._config.content, this.hass);
    const darkMode = this.hass?.themes?.darkMode ?? false;

    // Skip if resolved output unchanged
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
      const useAutoTheme =
        !this._config.theme || this._config.theme === "auto";

      const mermaidConfig: Record<string, unknown> = {
        startOnLoad: false,
        securityLevel: "loose",
        theme: useAutoTheme ? "base" : this._config.theme,
        fontFamily:
          "var(--paper-font-common-base_-_font-family, 'Roboto', 'Noto', sans-serif)",
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
      const message = err instanceof Error ? err.message : String(err);
      this._error =
        message
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
  description:
    "Render live Mermaid diagrams with HA entity data and theme integration",
  preview: true,
  documentationURL: "https://github.com/pajew-ski/ha-mermaid",
});
