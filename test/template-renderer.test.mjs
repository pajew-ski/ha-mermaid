import assert from "node:assert/strict";
import { test } from "node:test";
import { renderTemplate, maskValue, isSankey, extractReferencedEntities } from "../src/template-renderer.ts";

process.env.TZ = "UTC";

const ago = (ms) => new Date(Date.now() - ms).toISOString();
const entity = (state, attributes = {}, last_changed = ago(5 * 60e3)) => ({
  state, attributes, last_changed, last_updated: last_changed,
});
const hass = (extra = {}, props = {}) => ({
  language: "en",
  states: {
    "sensor.temperature": entity("23.5"),
    "sensor.humidity": entity("48"),
    "sensor.weather": entity("sunny", { pressure: 1013 }),
    "switch.pump": entity("on"),
    "sensor.temp": entity("26.4", { unit: "°C", offset: "-1.5" }),
    "alarm_control_panel.home": entity("armed_away"),
    "sensor.energy_daily": entity("3.14159"),
    "binary_sensor.motion": entity("off"),
    "binary_sensor.door": entity("on", {}, ago(3 * 3600e3)),
    "sensor.heating_power": entity("1200"),
    "sensor.lighting_power": entity("80.5"),
    "sensor.appliances_power": entity("340"),
    "sensor.price": entity("0.3149"),
    "sensor.motion": entity("on", {}, ago(30e3)),
    "sensor.last_motion": entity("on", {}, ago(2 * 86400e3)),
    ...extra,
  },
  ...props,
});

// Outputs recorded from the 0.7.1 regex renderer: every README and editor example must stay identical.
const regressions = [
  [`graph LR
    T["Temperature: \${states['sensor.temperature']}°C"]
    H["Humidity: \${states['sensor.humidity']}%"]
    P["Pressure: \${attr('sensor.weather', 'pressure')} hPa"]
    T --> H --> P`, `graph LR
    T["Temperature: 23.5°C"]
    H["Humidity: 48%"]
    P["Pressure: 1013 hPa"]
    T --> H --> P`],
  [`graph TD
    Pump["Pump: \${if(is_state('switch.pump', 'on'), 'ON', 'OFF')}"]
    Temp["Temp: \${if(states['sensor.temp'] > 25, 'HOT', 'OK')}"]
    Alarm["\${if(is_state('alarm_control_panel.home', 'armed_away'), 'ARMED', 'DISARMED')}"]`, `graph TD
    Pump["Pump: ON"]
    Temp["Temp: HOT"]
    Alarm["ARMED"]`],
  [`C["\${round(states['sensor.temp'], 1)}°C"] F["\${calc(states['sensor.temp'] * 1.8 + 32)}°F"] Cost["\${fixed(states['sensor.energy_daily'], 2)} EUR"]`,
    `C["26.4°C"] F["79.52°F"] Cost["3.14 EUR"]`],
  [`Motion["Last motion: \${timestamp('binary_sensor.motion')}"] Door["Door opened: \${timestamp('binary_sensor.door')}"]`,
    `Motion["Last motion: 5m ago"] Door["Door opened: 3h ago"]`],
  [`pie title Energy Distribution (Watts)
    "Heating" : \${states['sensor.heating_power']}
    "Lighting" : \${states['sensor.lighting_power']}
    "Appliances" : \${states['sensor.appliances_power']}`, `pie title Energy Distribution (Watts)
    "Heating" : 1200
    "Lighting" : 80.5
    "Appliances" : 340`],
  ["${states['sensor.temp']}", "26.4"],
  ["${states['sensor.temp'].state}", "26.4"],
  ["${attr('sensor.temp', 'unit')}", "°C"],
  ["${state_attr('sensor.temp', 'unit')}", "°C"],
  ["${is_state('switch.pump', 'on')}", "true"],
  ["${is_state('switch.pump', 'off')}", "false"],
  ["${if(is_state('switch.pump', 'on'), '🟢 ON', '🔴 OFF')}", "🟢 ON"],
  ["${if(states['sensor.temp'] > 25, 'Hot', 'OK')}", "Hot"],
  ["${if(states['sensor.temp'] < 25, 'A', 'B')}", "B"],
  ["${if(states['sensor.temp'] >= 26.4, 'A', 'B')}", "A"],
  ["${if(states['sensor.temp'] <= 26.4, 'A', 'B')}", "A"],
  ["${if(states['sensor.temp'] == 26.4, 'A', 'B')}", "A"],
  ["${if(states['sensor.temp'] != 26.4, 'A', 'B')}", "B"],
  ["${round(states['sensor.temp'])}", "26"],
  ["${fixed(states['sensor.price'])}", "0.31"],
  ["${timestamp('sensor.motion')}", "30s ago"],
  ["${timestamp('sensor.last_motion')}", "2d ago"],
  ["${style_class('switch.pump', 'on:active', 'off:inactive')}", "active"],
  ["${style_class('alarm_control_panel.home', 'on:active', 'off:inactive')}", "inactive"],
  ["${states['sensor.missing']}", "unavailable"],
  ["${round(states['sensor.missing'], 1)}", "0.0"],
  ["${unknown_fn('x')}", "${unknown_fn('x')}"],
  ["no template here", "no template here"],
];

test("0.7.1 examples render unchanged", () => {
  for (const [input, expected] of regressions) assert.equal(renderTemplate(input, hass()), expected, input);
});

test("without hass the content is returned as is", () => {
  assert.equal(renderTemplate("${states['a.b']}", undefined), "${states['a.b']}");
});

test("entity text is masked, raw() opts out", () => {
  const h = hass({ "sensor.msg": entity('a "b" #1 [x] {y} (z) <w> |v; c,d\nnext') });
  assert.equal(
    renderTemplate("${states['sensor.msg']}", h),
    "a #quot;b#quot; #35;1 #91;x#93; #123;y#125; #40;z#41; #60;w#62; #124;v#59; c,d next"
  );
  assert.equal(renderTemplate("${raw(states['sensor.msg'])}", h), h.states["sensor.msg"].state);
  assert.equal(renderTemplate("${attr('sensor.msg2', 'x')}", hass({ "sensor.msg2": entity("", { x: "[1]" }) })), "#91;1#93;");
});

test("commas are masked only in sankey diagrams", () => {
  const h = hass({ "sensor.name": entity("a,b") });
  assert.equal(renderTemplate("graph TD\nA[${states['sensor.name']}]", h), "graph TD\nA[a,b]");
  assert.equal(renderTemplate("sankey-beta\n${states['sensor.name']},X,1", h), "sankey-beta\na#44;b,X,1");
  assert.ok(isSankey("---\ntitle: t\n---\n%% note\n\nsankey-beta\n"));
  assert.ok(!isSankey("graph TD\n sankey"));
  assert.equal(maskValue("x\r\ny", false), "x y");
});

test("numeric contexts are not masked and use the fallback", () => {
  const h = hass({ "sensor.bad": entity("unknown") });
  assert.equal(renderTemplate("${calc(states['sensor.temp'] * 2)}", h), "52.8");
  assert.equal(renderTemplate("${calc(states['sensor.bad'] + 1)}", h), "1");
  assert.equal(renderTemplate("${calc(states['sensor.bad'] + 1)}", h, { numericFallback: -1 }), "0");
  assert.equal(renderTemplate("${round(states['sensor.bad'], 1)}", h, { numericFallback: 7 }), "7.0");
  assert.equal(renderTemplate("${if(states['sensor.bad'] > 5, 'A', 'B')}", h, { numericFallback: 9 }), "A");
});

test("calc, clamp, min and max", () => {
  const h = hass();
  assert.equal(renderTemplate("${calc(states['sensor.temp'] * 1.8 + 32, 1)}", h), "79.5");
  assert.equal(renderTemplate("${calc((1 + 2) * -3 % 5)}", h), "-4");
  assert.equal(renderTemplate("${clamp(states['sensor.temp'], 0, 25)}", h), "25");
  assert.equal(renderTemplate("${clamp(-4, 0, 25)}", h), "0");
  assert.equal(renderTemplate("${min(states['sensor.temp'], 3, 10)}", h), "3");
  assert.equal(renderTemplate("${max(states['sensor.temp'], 3, attr('sensor.temp', 'offset'))}", h), "26.4");
  assert.equal(renderTemplate("${min()}", h), "${min()}");
});

test("round and fixed accept attr() and expressions", () => {
  const h = hass();
  assert.equal(renderTemplate("${round(attr('sensor.temp', 'offset'))}", h), "-2");
  assert.equal(renderTemplate("${fixed(attr('sensor.weather', 'pressure'), 1)}", h), "1013.0");
  assert.equal(renderTemplate("${round(states['sensor.temp'] / 3, 2)}", h), "8.80");
});

test("if operands and branches", () => {
  const h = hass();
  assert.equal(renderTemplate("${if(attr('sensor.temp', 'offset') < -1, 'cold', 'ok')}", h), "cold");
  assert.equal(renderTemplate("${if(calc(states['sensor.temp'] - 20) > 6, 'A', 'B')}", h), "A");
  assert.equal(renderTemplate("${if(states['sensor.temp'] > -5, 'A', 'B')}", h), "A");
  assert.equal(renderTemplate("${if(states['switch.pump'] == 'on', 'A', 'B')}", h), "A");
  assert.equal(renderTemplate("${if(is_state('switch.pump', 'on'), states['sensor.temp'], 'off')}", h), "26.4");
  assert.equal(
    renderTemplate(`\${if(is_state('switch.pump', 'on'), 'Pump \${round(states["sensor.temp"])} W', 'off')}`, h),
    "Pump 26 W"
  );
  assert.equal(renderTemplate("${if(is_state('switch.pump', 'off'), 'A')}", h), "");
  const msg = hass({ "sensor.msg": entity("[x]") });
  assert.equal(renderTemplate("${if(true_val > 0, 'a', 'b')}", msg), "${if(true_val > 0, 'a', 'b')}");
  assert.equal(renderTemplate("${if(1 > 0, states['sensor.msg'], 'b')}", msg), "#91;x#93;");
});

test("timestamp follows hass.locale and has absolute forms", () => {
  const changed = "2026-01-02T15:04:00Z";
  const h = (locale) => hass({ "sensor.t": entity("on", {}, changed), "sensor.r": entity("on", {}, ago(5 * 60e3)) }, { locale });
  assert.match(renderTemplate("${timestamp('sensor.r')}", h({ language: "de" })), /^vor 5/);
  assert.equal(renderTemplate("${timestamp('sensor.t', 'time')}", h({ language: "de", time_format: "24" })), "15:04");
  assert.equal(renderTemplate("${timestamp('sensor.t', 'time')}", h({ language: "en", time_format: "12" })), "03:04 PM");
  assert.equal(renderTemplate("${timestamp('sensor.t', 'date')}", h({ language: "de" })), "02.01.2026");
  assert.equal(renderTemplate("${timestamp('sensor.t', 'datetime')}", h({ language: "de", time_format: "24" })), "02.01.2026, 15:04");
  assert.equal(renderTemplate("${timestamp('sensor.t', 'week')}", h({ language: "de" })), "${timestamp('sensor.t', 'week')}");
  assert.equal(renderTemplate("${timestamp('sensor.none', 'time')}", h({ language: "de" })), "unavailable");
});

test("referenced entities are detected inside nested expressions", () => {
  assert.deepEqual(
    extractReferencedEntities("${if(attr('sensor.a', 'x') > 1, timestamp('sensor.b'), states[\"sensor.c\"])}").sort(),
    ["sensor.a", "sensor.b", "sensor.c"]
  );
});
