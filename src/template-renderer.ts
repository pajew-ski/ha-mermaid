import type { HomeAssistant } from "./types";

/**
 * Resolves template expressions in Mermaid diagram content.
 *
 * Supported syntax:
 *   ${states['sensor.temperature']}         → entity state value
 *   ${states['sensor.temperature'].state}   → entity state value (explicit)
 *   ${attr('sensor.temperature', 'unit')}   → entity attribute
 *   ${state_attr('sensor.temp', 'unit')}    → alias for attr()
 *
 * Unknown entities resolve to "unavailable".
 */
export function renderTemplate(
  content: string,
  hass: HomeAssistant | undefined
): string {
  if (!hass) return content;

  // ${states['entity_id']} or ${states['entity_id'].state}
  let result = content.replace(
    /\$\{states\[['"]([^'"]+)['"]\](?:\.state)?\}/g,
    (_match, entityId: string) => {
      const entity = hass.states[entityId];
      return entity ? entity.state : "unavailable";
    }
  );

  // ${attr('entity_id', 'attribute')} or ${state_attr('entity_id', 'attribute')}
  result = result.replace(
    /\$\{(?:attr|state_attr)\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\}/g,
    (_match, entityId: string, attribute: string) => {
      const entity = hass.states[entityId];
      if (!entity) return "unavailable";
      const val = entity.attributes[attribute];
      return val !== undefined ? String(val) : "unavailable";
    }
  );

  return result;
}
