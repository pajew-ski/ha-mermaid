export interface MermaidCardConfig {
  type: string;
  content: string;
  title?: string;
  theme?: "auto" | "default" | "dark" | "forest" | "neutral";
  card_size?: number;
  entities?: string[];
  update_interval?: number;
  /** Value used when a numeric template context meets a non-numeric state. */
  numeric_fallback?: number;
  /** Node or subgraph ID -> Home Assistant action, fired on click or Enter. */
  actions?: Record<string, NodeAction>;
}

/** A standard HA action config (toggle, more-info, navigate, perform-action, ...). */
export interface NodeAction {
  action: string;
  entity?: string;
  [key: string]: unknown;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  themes: {
    darkMode: boolean;
    theme: string;
  };
  language: string;
  locale?: { language: string; time_format?: string };
  callService: (domain: string, service: string, data?: Record<string, unknown>) => void;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}
