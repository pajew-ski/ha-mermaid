import { css } from "lit";

export const cardStyles = css`
  :host {
    display: block;
    height: 100%;
  }

  ha-card {
    position: relative;
    overflow: hidden;
    padding: 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .card-header {
    font-size: var(--ha-card-header-font-size, 24px);
    font-weight: normal;
    color: var(--ha-card-header-color, var(--primary-text-color));
    padding: 0 0 12px 0;
    line-height: 1.2;
  }

  .mermaid-container {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: auto;
    min-height: 48px;
    flex: 1;
    cursor: pointer;
    position: relative;
  }

  .mermaid-container:hover::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--primary-color, #03a9f4);
    opacity: 0.04;
    border-radius: var(--ha-card-border-radius, 12px);
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .mermaid-container svg {
    max-width: 100%;
    max-height: 100%;
    height: auto;
    object-fit: contain;
  }

  /* Fullscreen overlay */
  .mermaid-fullscreen-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    display: flex;
    flex-direction: column;
    animation: mermaid-fade-in 0.2s ease;
  }

  @keyframes mermaid-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .fullscreen-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    flex-shrink: 0;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    z-index: 1;
  }

  .fullscreen-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fullscreen-actions {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .fullscreen-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: var(--primary-text-color, #212121);
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .fullscreen-btn:hover {
    background: var(--secondary-background-color, #e5e5e5);
  }

  .fullscreen-btn svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
    flex-shrink: 0;
  }

  .fullscreen-btn-close {
    color: var(--primary-text-color, #212121);
  }

  .fullscreen-viewport {
    flex: 1;
    overflow: hidden;
    position: relative;
    touch-action: none;
  }

  .fullscreen-content {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: 0 0;
  }

  .fullscreen-content svg {
    max-width: none;
    max-height: none;
  }

  .fullscreen-zoom-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 2;
  }

  .zoom-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--divider-color, #e0e0e0);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    color: var(--primary-text-color, #212121);
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: background 0.15s ease;
    line-height: 1;
  }

  .zoom-btn:hover {
    background: var(--secondary-background-color, #e5e5e5);
  }

  .zoom-level {
    text-align: center;
    font-size: 11px;
    color: var(--secondary-text-color, #727272);
    padding: 2px 0;
  }

  .mermaid-error {
    color: var(--error-color, #db4437);
    background: var(--secondary-background-color, #fafafa);
    border: 1px solid var(--error-color, #db4437);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 12px 16px;
    font-family: monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .mermaid-source-label {
    margin-top: 12px;
    color: var(--secondary-text-color, #727272);
  }

  .mermaid-source {
    margin: 4px 0 0;
    padding: 8px;
    max-height: 240px;
    overflow: auto;
    color: var(--primary-text-color, #212121);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border-radius: 4px;
    white-space: pre;
  }

  /* Last good diagram kept after a failed update */
  .render-warning {
    position: absolute;
    top: 8px;
    right: 8px;
    max-width: calc(100% - 16px);
    z-index: 1;
    font-size: 12px;
    color: var(--secondary-text-color, #727272);
  }

  .render-warning summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    justify-content: flex-end;
    opacity: 0.7;
  }

  .render-warning summary::-webkit-details-marker {
    display: none;
  }

  .render-warning summary svg {
    width: 18px;
    height: 18px;
    fill: var(--warning-color, #ffa600);
  }

  .render-warning[open] summary,
  .render-warning summary:hover {
    opacity: 1;
  }

  .render-warning-body {
    margin-top: 4px;
    padding: 8px 10px;
    background: var(--secondary-background-color, #fafafa);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    color: var(--primary-text-color, #212121);
    word-break: break-word;
  }

  .render-warning-body code {
    display: block;
    margin: 4px 0;
    color: var(--error-color, #db4437);
    white-space: pre-wrap;
  }

  .render-warning-body ul {
    margin: 4px 0 0;
    padding-left: 18px;
  }

  /* Nodes with a configured action */
  .mermaid-container [data-node-action] {
    cursor: pointer;
  }

  .mermaid-container [data-node-action]:focus {
    outline: none;
  }

  .mermaid-container [data-node-action]:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }

  .mermaid-container [data-node-action]:focus-visible > :is(rect, circle, ellipse, polygon, path) {
    stroke: var(--primary-color, #03a9f4) !important;
    stroke-width: 3px !important;
  }

  .mermaid-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 64px;
    color: var(--secondary-text-color, #727272);
    font-size: 14px;
  }

  .mermaid-empty {
    color: var(--secondary-text-color, #727272);
    font-style: italic;
    text-align: center;
    padding: 24px 16px;
  }
`;

export const editorStyles = css`
  :host {
    display: block;
  }

  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
  }

  .editor-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label {
    font-size: 12px;
    font-weight: 500;
    color: var(--primary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  textarea {
    width: 100%;
    min-height: 200px;
    padding: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: "Roboto Mono", "Courier New", monospace;
    font-size: 13px;
    line-height: 1.5;
    resize: vertical;
    box-sizing: border-box;
    tab-size: 2;
  }

  textarea:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
    box-shadow: 0 0 0 1px var(--primary-color, #03a9f4);
  }

  input[type="text"] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-size: 14px;
    box-sizing: border-box;
  }

  input[type="text"]:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
    box-shadow: 0 0 0 1px var(--primary-color, #03a9f4);
  }

  select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-size: 14px;
    box-sizing: border-box;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
    box-shadow: 0 0 0 1px var(--primary-color, #03a9f4);
  }

  input[type="number"] {
    width: 80px;
    padding: 8px 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-size: 14px;
    box-sizing: border-box;
  }

  .help-text {
    font-size: 12px;
    color: var(--secondary-text-color, #727272);
    line-height: 1.4;
  }
`;
