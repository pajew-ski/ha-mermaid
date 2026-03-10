export interface MermaidCardConfig {
  type: string;
  content: string;
  title?: string;
  theme?: "auto" | "default" | "dark" | "forest" | "neutral";
  card_size?: number;
  card_height?: string;
  entities?: string[];
  update_interval?: number;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  themes: {
    darkMode: boolean;
    theme: string;
  };
  language: string;
  callService: (domain: string, service: string, data?: Record<string, unknown>) => void;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}
