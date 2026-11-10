import type { HassEntity, NodeAction } from "./types";

// Pure helpers of the card, kept free of Lit and Mermaid so `npm test` can run them in Node.

/** State of each watched entity, to report which ones changed since the last good render. */
export function entitySnapshot(
  states: Record<string, HassEntity> | undefined,
  ids: string[]
): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const id of ids) snapshot[id] = states?.[id]?.state ?? "unavailable";
  return snapshot;
}

export interface RenderError {
  message: string;
  /** Entities whose state differs from the last successful render (fallback case). */
  changed: string[];
  /** Resolved diagram text, shown when there is no earlier diagram to fall back to. */
  source?: string;
}

/**
 * Describe a failed render. With a previous success (`lastGood`), the card keeps
 * that SVG and lists what changed since; without one it shows the resolved text.
 */
export function describeRenderError(
  message: string,
  lastGood: Record<string, string> | null,
  now: Record<string, string>,
  resolved: string
): RenderError {
  if (!lastGood) return { message, changed: [], source: resolved };
  return { message, changed: Object.keys(now).filter((id) => lastGood[id] !== now[id]) };
}

export const ACTION_ATTR = "data-node-action";

// Mermaid DOM ids look like flowchart-<id>-<n>, state-<id>-<n>, classId-<id>-<n>, entity-<id>-<n>;
// subgraph clusters use the bare id. Mermaid 12 prefixes every id with the render id
// (mermaid-<n>- from mermaid-card.ts), clusters included.
const RENDER_ID = /^mermaid-\d+-/;
const DOM_ID = /^(?:.*?-)?(?:flowchart|state|classId|entity)-(.+)-\d+$/;

/** The diagram's own node ID for a rendered element. */
export function nodeIdOf(domId: string, dataId?: string | null): string {
  if (dataId) return dataId;
  const id = domId.replace(RENDER_ID, "");
  return DOM_ID.exec(id)?.[1] ?? id;
}

/**
 * Mark every node or cluster that has a configured action: focusable, announced as a
 * button, and tagged with its node ID so one delegated listener can dispatch it.
 * Returns the number of marked elements.
 */
export function markActionNodes(
  root: ParentNode,
  actions: Record<string, NodeAction> | undefined
): number {
  if (!actions) return 0;
  let marked = 0;
  for (const el of Array.from(root.querySelectorAll("g.node, g.rough-node, g.cluster"))) {
    const id = nodeIdOf(el.id, el.getAttribute("data-id"));
    if (!Object.prototype.hasOwnProperty.call(actions, id)) continue;
    el.setAttribute(ACTION_ATTR, id);
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", el.textContent?.trim() || id);
    marked++;
  }
  return marked;
}

/** Detail of the `hass-action` event HA cards fire for a tap (confirmation is handled by HA). */
export function actionEventDetail(action: NodeAction): {
  config: { entity?: string; tap_action: NodeAction };
  action: "tap";
} {
  return { config: { entity: action.entity, tap_action: action }, action: "tap" };
}
