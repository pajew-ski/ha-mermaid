import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { MermaidCardConfig, HomeAssistant } from "./types";
import { editorStyles } from "./styles";

const DEFAULT_CONTENT = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]`;

export class MermaidCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: MermaidCardConfig;

  static styles = editorStyles;

  setConfig(config: MermaidCardConfig): void {
    this._config = { ...config };
  }

  private _dispatchChanged(): void {
    if (!this._config) return;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _contentChanged(ev: Event): void {
    const target = ev.target as HTMLTextAreaElement;
    this._config = { ...this._config!, content: target.value };
    this._dispatchChanged();
  }

  private _titleChanged(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const value = target.value.trim();
    if (value) {
      this._config = { ...this._config!, title: value };
    } else {
      const { title: _, ...rest } = this._config!;
      this._config = rest as MermaidCardConfig;
    }
    this._dispatchChanged();
  }

  private _themeChanged(ev: Event): void {
    const target = ev.target as HTMLSelectElement;
    const value = target.value as MermaidCardConfig["theme"];
    if (value === "auto") {
      const { theme: _, ...rest } = this._config!;
      this._config = rest as MermaidCardConfig;
    } else {
      this._config = { ...this._config!, theme: value };
    }
    this._dispatchChanged();
  }

  private _cardSizeChanged(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    if (value && value > 0) {
      this._config = { ...this._config!, card_size: value };
    } else {
      const { card_size: _, ...rest } = this._config!;
      this._config = rest as MermaidCardConfig;
    }
    this._dispatchChanged();
  }

  private _handleKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Tab") {
      ev.preventDefault();
      const textarea = ev.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value =
        textarea.value.substring(0, start) +
        "  " +
        textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      this._contentChanged(ev);
    }
  }

  protected render() {
    if (!this._config) return nothing;

    const theme = this._config.theme || "auto";

    return html`
      <div class="editor-container">
        <div class="editor-row">
          <label>Title (optional)</label>
          <input
            type="text"
            .value=${this._config.title || ""}
            @input=${this._titleChanged}
            placeholder="My Diagram"
          />
        </div>

        <div class="editor-row">
          <label>Mermaid Diagram</label>
          <textarea
            .value=${this._config.content || DEFAULT_CONTENT}
            @input=${this._contentChanged}
            @keydown=${this._handleKeydown}
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
          ></textarea>
          <span class="help-text">
            Supports all Mermaid diagram types: flowchart, sequence, gantt,
            class, state, ER, pie, mindmap, timeline, and more.<br />
            Use <code>\${states['entity_id']}</code> for entity states and
            <code>\${attr('entity_id', 'attribute')}</code> for attributes.
          </span>
        </div>

        <div class="editor-row">
          <label>Theme</label>
          <select .value=${theme} @change=${this._themeChanged}>
            <option value="auto">Auto (match Home Assistant)</option>
            <option value="default">Mermaid Default</option>
            <option value="dark">Mermaid Dark</option>
            <option value="forest">Mermaid Forest</option>
            <option value="neutral">Mermaid Neutral</option>
          </select>
          <span class="help-text">
            "Auto" maps your HA theme colors to the diagram. Other options use
            Mermaid's built-in themes.
          </span>
        </div>

        <div class="editor-row">
          <label>Card Size (optional)</label>
          <input
            type="number"
            .value=${String(this._config.card_size || "")}
            @input=${this._cardSizeChanged}
            min="1"
            max="20"
            placeholder="auto"
          />
          <span class="help-text">
            Override the card height in the dashboard grid (1-20).
          </span>
        </div>
      </div>
    `;
  }
}

customElements.define("mermaid-card-editor", MermaidCardEditor);
