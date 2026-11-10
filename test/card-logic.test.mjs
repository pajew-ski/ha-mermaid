import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACTION_ATTR,
  actionEventDetail,
  describeRenderError,
  entitySnapshot,
  markActionNodes,
  nodeIdOf,
} from "../src/card-logic.ts";

const states = {
  "sensor.a": { state: "1" },
  "sensor.b": { state: "x" },
};

test("failed update with an earlier diagram keeps it and lists changed entities", () => {
  const before = entitySnapshot(states, ["sensor.a", "sensor.b", "sensor.gone"]);
  const now = entitySnapshot({ ...states, "sensor.b": { state: "y" } }, ["sensor.a", "sensor.b", "sensor.gone"]);
  assert.deepEqual(before, { "sensor.a": "1", "sensor.b": "x", "sensor.gone": "unavailable" });
  assert.deepEqual(describeRenderError("Parse error", before, now, "graph TD\nA[y"), {
    message: "Parse error",
    changed: ["sensor.b"],
  });
});

test("failed first render shows the resolved diagram text", () => {
  assert.deepEqual(describeRenderError("Parse error", null, {}, "graph TD\nA[y"), {
    message: "Parse error",
    changed: [],
    source: "graph TD\nA[y",
  });
});

test("node IDs are recovered from Mermaid DOM ids", () => {
  assert.equal(nodeIdOf("flowchart-Pump-3"), "Pump");
  assert.equal(nodeIdOf("flowchart-B-A-12"), "B-A");
  assert.equal(nodeIdOf("mermaid-4-flowchart-Pump-0"), "Pump");
  assert.equal(nodeIdOf("state-Idle-2"), "Idle");
  assert.equal(nodeIdOf("classId-Animal-0"), "Animal");
  assert.equal(nodeIdOf("Kitchen"), "Kitchen");
  assert.equal(nodeIdOf("mermaid-4-Kitchen"), "Kitchen"); // Mermaid 12 cluster
  assert.equal(nodeIdOf("whatever", "Garage"), "Garage");
});

const fakeElement = (id, text, attrs = {}) => ({
  id,
  textContent: text,
  attrs: { ...attrs },
  getAttribute(name) { return this.attrs[name] ?? null; },
  setAttribute(name, value) { this.attrs[name] = value; },
});

test("actions bind only to configured node and subgraph IDs", () => {
  const pump = fakeElement("flowchart-Pump-0", " Pump: ON ");
  const other = fakeElement("flowchart-Other-1", "Other");
  const proto = fakeElement("flowchart-toString-2", "x");
  const cluster = fakeElement("Kitchen", "Kitchen");
  let selector = "";
  const root = { querySelectorAll: (s) => ((selector = s), [pump, other, proto, cluster]) };
  const actions = {
    Pump: { action: "toggle", entity: "switch.pump" },
    Kitchen: { action: "navigate", navigation_path: "/lovelace/kitchen" },
  };

  assert.equal(markActionNodes(root, actions), 2);
  assert.equal(selector, "g.node, g.rough-node, g.cluster");
  assert.deepEqual(pump.attrs, { [ACTION_ATTR]: "Pump", tabindex: "0", role: "button", "aria-label": "Pump: ON" });
  assert.equal(cluster.attrs[ACTION_ATTR], "Kitchen");
  assert.deepEqual(other.attrs, {});
  assert.deepEqual(proto.attrs, {});
  assert.equal(markActionNodes(root, undefined), 0);
});

test("hass-action detail matches what HA cards send", () => {
  const toggle = { action: "toggle", entity: "switch.pump", confirmation: true };
  assert.deepEqual(actionEventDetail(toggle), {
    config: { entity: "switch.pump", tap_action: toggle },
    action: "tap",
  });
  const call = { action: "perform-action", perform_action: "light.turn_on", target: { entity_id: "light.desk" } };
  assert.deepEqual(actionEventDetail(call).config.tap_action, call);
});
