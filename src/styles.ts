import { css } from "lit";

export const cardStyles = css`
  :host {
    display: block;
  }

  ha-card {
    overflow: hidden;
    padding: 16px;
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
    overflow-x: auto;
    overflow-y: hidden;
    min-height: 48px;
  }

  .mermaid-container svg {
    max-width: 100%;
    height: auto;
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
