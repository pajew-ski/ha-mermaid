import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import mermaid from "mermaid";
import type { MermaidCardConfig, HomeAssistant } from "./types";
import { getHATheme, contrastTextColor, contrastRatio } from "./theme-mapper";
import { renderTemplate, extractReferencedEntities } from "./template-renderer";
import { cardStyles } from "./styles";
import "./editor";

const CARD_VERSION = "1.1.1";

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
  @state() private _fullscreen = false;
  @state() private _zoom = 1;

  private _lastRenderedContent = "";
  private _lastDarkMode: boolean | null = null;
  private _watchedEntities: string[] = [];
  private _lastEntityStates: Record<string, string> = {};
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _intervalTimer: ReturnType<typeof setInterval> | null = null;
  private _panX = 0;
  private _panY = 0;
  private _isPanning = false;
  private _panStartX = 0;
  private _panStartY = 0;
  private _lastPanX = 0;
  private _lastPanY = 0;
  private _initialPinchDist = 0;
  private _initialPinchZoom = 1;

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
    this._removeViewportListeners();
    document.removeEventListener("keydown", this._onEscKey);
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
      mermaid.initialize(this._buildMermaidConfig(false));

      const id = `mermaid-${++renderCounter}`;
      const { svg } = await mermaid.render(id, resolvedContent);

      this._svgContent = this._postProcessSvg(svg);
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

  /**
   * Build the Mermaid config for the current card settings.
   * @param forExport  Use pure-SVG labels and strict security so the result
   *   can be drawn onto a canvas (PNG export).
   */
  private _buildMermaidConfig(forExport: boolean): Record<string, unknown> {
    const theme = this._config?.theme;
    const useAutoTheme = !theme || theme === "auto";

    const config: Record<string, unknown> = {
      startOnLoad: false,
      suppressErrorRendering: true,
      securityLevel: forExport ? "strict" : "loose",
      theme: useAutoTheme ? "base" : theme,
      fontFamily: forExport
        ? "'Roboto', 'Noto', sans-serif"
        : "var(--paper-font-common-base_-_font-family, 'Roboto', 'Noto', sans-serif)",
    };

    if (forExport) {
      config.htmlLabels = false;
      config.flowchart = { htmlLabels: false };
      config.sequence = { htmlLabels: false };
    }

    if (useAutoTheme) {
      const haTheme = getHATheme(this, this.hass?.themes?.darkMode ?? false);
      config.themeVariables = haTheme.themeVariables;
      config.themeCSS = haTheme.themeCSS;
    }

    return config;
  }

  /**
   * Post-process a rendered SVG to fix text contrast issues.
   *
   * Mermaid applies most fills through the embedded stylesheet (e.g. mindmap
   * sections, user classDef/style directives), so the SVG is mounted into the
   * card's shadow DOM and inspected with getComputedStyle(). Every text label
   * is compared against the fill of its nearest enclosing shape; labels that
   * fall below a 3:1 contrast ratio are recolored with an inline style, which
   * takes precedence over the stylesheet.
   */
  private _postProcessSvg(svg: string): string {
    const root = this.shadowRoot;
    if (!root) return svg;

    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    // Rendered at full size (off-screen) so bounding boxes are meaningful.
    host.style.cssText =
      "position:fixed;left:-100000px;top:0;width:4000px;height:4000px;" +
      "overflow:hidden;visibility:hidden;pointer-events:none;";
    host.innerHTML = svg;
    root.appendChild(host);

    try {
      const svgEl = host.querySelector("svg");
      if (!svgEl) return svg;
      this._fixLabelContrast(svgEl);
      return new XMLSerializer().serializeToString(svgEl);
    } catch {
      return svg;
    } finally {
      host.remove();
    }
  }

  private _fixLabelContrast(svgEl: SVGSVGElement): void {
    const SHAPES = "rect, circle, ellipse, polygon, path";
    const isVisibleFill = (fill: string): boolean =>
      !!fill && fill !== "none" && fill !== "transparent" &&
      !/rgba\([^)]*,\s*0\)$/.test(fill);

    interface Shape { fill: string; box: DOMRect }

    // Collect every group that directly contains a filled, non-empty shape.
    // Mermaid nests helper rects (e.g. an empty <rect> inside each flowchart
    // label) that inherit node colors via CSS, so shapes are matched to
    // labels geometrically rather than by DOM nesting alone.
    const shapesByGroup = new Map<Element, Shape[]>();
    for (const g of Array.from(svgEl.querySelectorAll("g"))) {
      const shapes: Shape[] = [];
      for (const child of Array.from(g.children)) {
        if (!child.matches(SHAPES)) continue;
        const fill = getComputedStyle(child).fill;
        if (!isVisibleFill(fill)) continue;
        const box = child.getBoundingClientRect();
        if (box.width < 2 || box.height < 2) continue;
        shapes.push({ fill, box });
      }
      if (shapes.length) shapesByGroup.set(g, shapes);
    }
    if (shapesByGroup.size === 0) return;

    const contains = (box: DOMRect, x: number, y: number): boolean =>
      x >= box.left - 1 && x <= box.right + 1 &&
      y >= box.top - 1 && y <= box.bottom + 1;

    // Background of a label: the nearest enclosing shape whose box contains
    // the label's center (so legend text next to a swatch is left alone).
    const backgroundFor = (label: Element): string | null => {
      const box = label.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return null;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      let cur: Element | null = label.parentElement;
      while (cur && cur !== (svgEl as Element)) {
        const shapes = shapesByGroup.get(cur);
        if (shapes) {
          const hit = shapes.find((s) => contains(s.box, cx, cy));
          if (hit) return hit.fill;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const labels = svgEl.querySelectorAll<SVGElement | HTMLElement>(
      "text, foreignObject span, foreignObject div, foreignObject p"
    );
    for (const label of labels) {
      // Skip containers whose text lives in a child element we also visit
      if (label.querySelector("span, div, p")) continue;
      if (!label.textContent?.trim()) continue;

      const bg = backgroundFor(label);
      if (!bg) continue;

      const isSvgText = label instanceof SVGElement;
      const style = getComputedStyle(label);
      const fg = isSvgText ? style.fill : style.color;

      const ratio = contrastRatio(bg, fg);
      if (ratio !== null && ratio >= 3) continue;

      // Inline !important wins over Mermaid's own !important rules (gantt).
      const ideal = contrastTextColor(bg);
      label.style.setProperty(isSvgText ? "fill" : "color", ideal, "important");
    }
  }

  // --- Fullscreen & Zoom ---

  private _openFullscreen(): void {
    this._fullscreen = true;
    this._zoom = 1;
    this._panX = 0;
    this._panY = 0;
    document.addEventListener("keydown", this._onEscKey);
  }

  private _closeFullscreen(): void {
    this._fullscreen = false;
    this._removeViewportListeners();
    document.removeEventListener("keydown", this._onEscKey);
  }

  /**
   * Attach touch/wheel listeners imperatively with { passive: false }
   * so we can call preventDefault() without Chrome's non-passive warning.
   */
  private _attachViewportListeners(): void {
    const vp = this.shadowRoot?.querySelector(".fullscreen-viewport");
    if (!vp) return;
    vp.addEventListener("touchstart", this._onTouchStart as EventListener, { passive: false });
    vp.addEventListener("touchmove", this._onTouchMove as EventListener, { passive: false });
    vp.addEventListener("wheel", this._onWheel as EventListener, { passive: false });
  }

  private _removeViewportListeners(): void {
    const vp = this.shadowRoot?.querySelector(".fullscreen-viewport");
    if (!vp) return;
    vp.removeEventListener("touchstart", this._onTouchStart as EventListener);
    vp.removeEventListener("touchmove", this._onTouchMove as EventListener);
    vp.removeEventListener("wheel", this._onWheel as EventListener);
  }

  protected updated(changedProps: Map<string, unknown>): void {
    super.updated(changedProps);

    // When hass changes, only re-render if watched entities changed
    if (changedProps.has("hass") && this._watchedEntities.length > 0) {
      if (!this._hasRelevantChanges()) return;
    }

    this._scheduleRender();

    // Attach listeners after fullscreen renders into the DOM
    if (changedProps.has("_fullscreen") && this._fullscreen) {
      this.updateComplete.then(() => this._attachViewportListeners());
    }
  }

  private _onEscKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this._closeFullscreen();
  };

  private _zoomIn(): void {
    this._zoom = Math.min(5, this._zoom * 1.3);
    this.requestUpdate();
  }

  private _zoomOut(): void {
    this._zoom = Math.max(0.2, this._zoom / 1.3);
    this.requestUpdate();
  }

  private _zoomReset(): void {
    this._zoom = 1;
    this._panX = 0;
    this._panY = 0;
    this.requestUpdate();
  }

  // Pointer / touch panning
  private _onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === "touch" || e.button === 0) {
      this._isPanning = true;
      this._panStartX = e.clientX;
      this._panStartY = e.clientY;
      this._lastPanX = this._panX;
      this._lastPanY = this._panY;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  private _onPointerMove = (e: PointerEvent): void => {
    if (!this._isPanning) return;
    this._panX = this._lastPanX + (e.clientX - this._panStartX);
    this._panY = this._lastPanY + (e.clientY - this._panStartY);
    this.requestUpdate();
  };

  private _onPointerUp = (): void => {
    this._isPanning = false;
  };

  // Pinch-to-zoom for touch
  private _onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._initialPinchDist = Math.hypot(dx, dy);
      this._initialPinchZoom = this._zoom;
    }
  };

  private _onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / this._initialPinchDist;
      this._zoom = Math.max(0.2, Math.min(5, this._initialPinchZoom * scale));
      this.requestUpdate();
    }
  };

  // Mouse wheel zoom in fullscreen
  private _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this._zoom = Math.max(0.2, Math.min(5, this._zoom * factor));
    this.requestUpdate();
  };

  // --- Download ---

  private _downloadSvg(): void {
    if (!this._svgContent) return;
    // Add XML declaration and namespace for standalone SVG file
    const svgWithNs = this._prepareSvgForExport(this._svgContent);
    const blob = new Blob([svgWithNs], { type: "image/svg+xml;charset=utf-8" });
    const name = (this._config?.title || "mermaid-diagram").replace(/\s+/g, "-");
    this._triggerDownload(blob, `${name}.svg`);
  }

  private async _downloadPng(): Promise<void> {
    if (!this._svgContent) return;
    const name = (this._config?.title || "mermaid-diagram").replace(/\s+/g, "-");

    // Re-render with htmlLabels disabled to get pure SVG (no foreignObject)
    // This ensures the image can be drawn to canvas without CORS/security issues
    try {
      const resolvedContent = renderTemplate(this._config!.content, this.hass);

      mermaid.initialize(this._buildMermaidConfig(true));
      const exportId = `mermaid-export-${++renderCounter}`;
      const { svg: exportSvg } = await mermaid.render(exportId, resolvedContent);

      // Re-init with original config for future renders
      mermaid.initialize(this._buildMermaidConfig(false));

      const processedSvg = this._postProcessSvg(exportSvg);
      await this._svgToPng(processedSvg, name);
    } catch {
      // Fallback: try with original SVG content
      await this._svgToPng(this._svgContent, name);
    }
  }

  private async _svgToPng(svgContent: string, name: string): Promise<void> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return;

    // Ensure xmlns is set
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Remove any foreignObject elements that could taint the canvas
    const foreignObjects = svgEl.querySelectorAll("foreignObject");
    for (const fo of foreignObjects) {
      // Try to extract text content and replace with a simple SVG text element
      const textContent = fo.textContent?.trim() || "";
      if (textContent) {
        const svgText = doc.createElementNS("http://www.w3.org/2000/svg", "text");
        const x = fo.getAttribute("x") || "0";
        const y = fo.getAttribute("y") || "0";
        const width = fo.getAttribute("width") || "100";
        const height = fo.getAttribute("height") || "20";
        svgText.setAttribute("x", String(parseFloat(x) + parseFloat(width) / 2));
        svgText.setAttribute("y", String(parseFloat(y) + parseFloat(height) / 2));
        svgText.setAttribute("text-anchor", "middle");
        svgText.setAttribute("dominant-baseline", "central");
        svgText.setAttribute("font-size", "14");
        // Inherit fill from closest parent or use a safe default
        const parentFill = fo.closest("[fill]")?.getAttribute("fill");
        const foStyle = fo.querySelector("[style]");
        const colorMatch = foStyle?.getAttribute("style")?.match(/color:\s*([^;]+)/);
        svgText.setAttribute("fill", colorMatch?.[1] || parentFill || "currentColor");
        svgText.textContent = textContent;
        fo.parentNode?.replaceChild(svgText, fo);
      } else {
        fo.remove();
      }
    }

    let width = parseFloat(svgEl.getAttribute("width") || "0");
    let height = parseFloat(svgEl.getAttribute("height") || "0");
    const viewBox = svgEl.getAttribute("viewBox");
    if ((!width || !height) && viewBox) {
      const parts = viewBox.split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        width = parts[2] || 800;
        height = parts[3] || 600;
      }
    }
    width = width || 800;
    height = height || 600;

    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d")!;

    const bg = getComputedStyle(this).getPropertyValue("--ha-card-background").trim()
      || getComputedStyle(this).getPropertyValue("--card-background-color").trim()
      || "#ffffff";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);

    // Use data URI instead of blob URL to avoid tainted canvas security issues
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const base64 = btoa(unescape(encodeURIComponent(serialized)));
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) this._triggerDownload(pngBlob, `${name}.png`);
          resolve();
        }, "image/png");
      };
      img.onerror = () => {
        resolve();
      };
      img.src = dataUrl;
    });
  }

  private _prepareSvgForExport(svg: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return svg;
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      new XMLSerializer().serializeToString(svgEl);
  }

  private _triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Render ---

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
                  @click=${this._openFullscreen}
                  .innerHTML=${this._svgContent}
                ></div>`
              : html`<div class="mermaid-empty">
                  No diagram content defined.
                </div>`}
      </ha-card>
      ${this._fullscreen ? this._renderFullscreen() : nothing}
    `;
  }

  private _renderFullscreen() {
    const transform = `translate(${this._panX}px, ${this._panY}px) scale(${this._zoom})`;
    const zoomPct = Math.round(this._zoom * 100);

    // SVG icons inline (no external deps)
    const iconClose = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    const iconSvg = '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';
    const iconPng = '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';

    return html`
      <div class="mermaid-fullscreen-overlay">
        <div class="fullscreen-toolbar">
          <span class="fullscreen-title">${this._config?.title || "Mermaid Diagram"}</span>
          <div class="fullscreen-actions">
            <button class="fullscreen-btn" @click=${this._downloadSvg}
              title="Download SVG">
              <span .innerHTML=${iconSvg}></span>SVG
            </button>
            <button class="fullscreen-btn" @click=${this._downloadPng}
              title="Download PNG">
              <span .innerHTML=${iconPng}></span>PNG
            </button>
            <button class="fullscreen-btn fullscreen-btn-close" @click=${this._closeFullscreen}
              title="Close (Esc)">
              <span .innerHTML=${iconClose}></span>
            </button>
          </div>
        </div>
        <div class="fullscreen-viewport"
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerUp}
        >
          <div class="fullscreen-content"
            style="transform: ${transform}; transform-origin: center center;"
            .innerHTML=${this._svgContent}
          ></div>
        </div>
        <div class="fullscreen-zoom-controls">
          <button class="zoom-btn" @click=${this._zoomIn} title="Zoom in">+</button>
          <div class="zoom-level" @click=${this._zoomReset}>${zoomPct}%</div>
          <button class="zoom-btn" @click=${this._zoomOut} title="Zoom out">−</button>
        </div>
      </div>
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
