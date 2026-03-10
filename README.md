# Mermaid Diagram Card for Home Assistant

[![HACS Badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/pajew-ski/ha-mermaid?style=for-the-badge)](https://github.com/pajew-ski/ha-mermaid/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A custom Lovelace card that renders **Mermaid diagrams** natively in Home Assistant — with full theme integration so diagrams look like a natural part of your dashboard.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=pajew-ski&repository=ha-mermaid&category=plugin)

## Features

- **All Mermaid diagram types**: flowchart, sequence, gantt, class, state, ER, pie, mindmap, timeline, quadrant, sankey, XY chart, block, and more
- **Automatic theming**: Diagrams inherit your HA theme colors, fonts, and style — light or dark mode
- **Entity templating**: Use `${states['sensor.temperature']}` in your diagram to show live entity values
- **Visual card editor**: Configure everything from the UI — no YAML required
- **Responsive**: Diagrams scale to fit the card width
- **Accessible**: Semantic SVG output with proper contrast ratios

## Installation

### HACS (Recommended)

Click the button above, or:

1. Open **HACS** in your Home Assistant instance
2. Search for **Mermaid Diagram Card**
3. Click **Download**
4. Refresh your browser (Ctrl+F5)

<details>
<summary>Manual HACS install (if not in default store yet)</summary>

1. Open HACS → three dots menu → **Custom repositories**
2. Add `https://github.com/pajew-ski/ha-mermaid` with category **Plugin**
3. Click **Download**
4. Refresh your browser

</details>

### Manual

1. Download `ha-mermaid.js` from the [latest release](https://github.com/pajew-ski/ha-mermaid/releases)
2. Copy it to `config/www/ha-mermaid.js`
3. Add the resource in **Settings → Dashboards → Resources**:
   - URL: `/local/ha-mermaid.js`
   - Type: JavaScript Module

## Usage

### Visual Editor

1. Edit your dashboard
2. Add a card → search for **Mermaid Diagram Card**
3. Enter your Mermaid diagram code
4. Done!

### YAML Configuration

```yaml
type: custom:mermaid-card
title: My Workflow
content: |
  graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
```

### Configuration Options

| Option            | Type     | Default      | Description                                        |
| ----------------- | -------- | ------------ | -------------------------------------------------- |
| `content`         | string   | **required** | Mermaid diagram code (supports templates)          |
| `title`           | string   | —            | Card title                                         |
| `theme`           | string   | `auto`       | `auto`, `default`, `dark`, `forest`, or `neutral`  |
| `entities`        | string[] | —            | Additional entities to watch (auto-detected from templates) |
| `update_interval` | number   | —            | Force re-render every N seconds                    |
| `card_size`       | number   | 4            | Card height in the dashboard grid (1-20)           |

### Live Entity Data

The card **automatically updates** when referenced entities change state. Entity IDs in templates are auto-detected — no extra configuration needed.

#### Basic State Access

```yaml
type: custom:mermaid-card
title: Climate Overview
content: |
  graph LR
    T["Temperature: ${states['sensor.temperature']}°C"]
    H["Humidity: ${states['sensor.humidity']}%"]
    P["Pressure: ${attr('sensor.weather', 'pressure')} hPa"]
    T --> H --> P
```

#### Conditional Logic

Show different text or icons based on entity state:

```yaml
type: custom:mermaid-card
title: System Status
content: |
  graph TD
    Pump["Pump: ${if(is_state('switch.pump', 'on'), 'ON', 'OFF')}"]
    Temp["Temp: ${if(states['sensor.temp'] > 25, 'HOT', 'OK')}"]
    Alarm["${if(is_state('alarm_control_panel.home', 'armed_away'), 'ARMED', 'DISARMED')}"]
    Pump --> Temp --> Alarm
```

#### Math & Formatting

```yaml
type: custom:mermaid-card
title: Conversions
content: |
  graph LR
    C["${round(states['sensor.temp'], 1)}°C"]
    F["${calc(states['sensor.temp'] * 1.8 + 32)}°F"]
    Cost["${fixed(states['sensor.energy_daily'], 2)} EUR"]
    C --> F
```

#### Relative Timestamps

```yaml
type: custom:mermaid-card
content: |
  graph TD
    Motion["Last motion: ${timestamp('binary_sensor.motion')}"]
    Door["Door opened: ${timestamp('binary_sensor.door')}"]
```

#### Dynamic Pie Chart from Sensors

```yaml
type: custom:mermaid-card
title: Current Energy Usage
content: |
  pie title Energy Distribution (Watts)
    "Heating" : ${states['sensor.heating_power']}
    "Lighting" : ${states['sensor.lighting_power']}
    "Appliances" : ${states['sensor.appliances_power']}
```

#### Full Template Reference

| Template | Description | Example Output |
| -------- | ----------- | -------------- |
| `${states['entity_id']}` | Entity state | `23.5` |
| `${attr('entity_id', 'attr')}` | Entity attribute | `°C` |
| `${state_attr('entity_id', 'attr')}` | Alias for `attr()` | `°C` |
| `${is_state('entity_id', 'on')}` | State comparison | `true` / `false` |
| `${if(is_state('e', 'on'), 'A', 'B')}` | Conditional on state | `A` or `B` |
| `${if(states['e'] > 25, 'A', 'B')}` | Conditional on number | `A` or `B` |
| `${calc(states['e'] * 1.8 + 32)}` | Math expression | `73.4` |
| `${round(states['e'], 1)}` | Round to decimals | `23.5` |
| `${fixed(states['e'], 2)}` | Fixed decimals | `23.50` |
| `${timestamp('entity_id')}` | Time since last change | `5m ago` |

Supported comparison operators: `>`, `<`, `>=`, `<=`, `==`, `!=`

### Diagram Examples

<details>
<summary><b>Sequence Diagram</b></summary>

```yaml
type: custom:mermaid-card
title: Automation Flow
content: |
  sequenceDiagram
    participant S as Sensor
    participant A as Automation
    participant L as Light
    S->>A: Motion detected
    A->>L: Turn on
    Note over A,L: Wait 5 minutes
    A->>L: Turn off
```

</details>

<details>
<summary><b>Pie Chart</b></summary>

```yaml
type: custom:mermaid-card
title: Energy Distribution
content: |
  pie title Energy Usage
    "Heating" : 45
    "Lighting" : 20
    "Appliances" : 25
    "Other" : 10
```

</details>

<details>
<summary><b>State Diagram</b></summary>

```yaml
type: custom:mermaid-card
title: Alarm States
content: |
  stateDiagram-v2
    [*] --> Disarmed
    Disarmed --> Armed_Home: Arm Home
    Disarmed --> Armed_Away: Arm Away
    Armed_Home --> Triggered: Sensor Alert
    Armed_Away --> Triggered: Sensor Alert
    Triggered --> Disarmed: Disarm
    Armed_Home --> Disarmed: Disarm
    Armed_Away --> Disarmed: Disarm
```

</details>

<details>
<summary><b>Gantt Chart</b></summary>

```yaml
type: custom:mermaid-card
title: Daily Schedule
content: |
  gantt
    title Daily Automation Schedule
    dateFormat HH:mm
    axisFormat %H:%M
    section Lighting
      Morning lights    :06:00, 08:00
      Evening lights    :17:00, 23:00
    section Climate
      Heating boost     :06:30, 08:00
      Eco mode          :08:00, 17:00
      Comfort mode      :17:00, 22:00
```

</details>

<details>
<summary><b>Mindmap</b></summary>

```yaml
type: custom:mermaid-card
title: Smart Home
content: |
  mindmap
    root((Smart Home))
      Lighting
        Living Room
        Bedroom
        Kitchen
      Climate
        Thermostat
        Fans
        AC
      Security
        Cameras
        Alarm
        Locks
      Media
        TV
        Speakers
```

</details>

## Theming

When **Theme** is set to `auto` (default), the card reads your current Home Assistant theme's CSS variables and maps them to Mermaid's color system:

| HA Variable | Used For |
| ----------- | -------- |
| `--primary-color` | Node borders, active elements |
| `--accent-color` | Secondary elements, highlights |
| `--primary-text-color` | All text labels |
| `--ha-card-background` | Diagram backgrounds |
| `--divider-color` | Borders and grid lines |
| `--error-color` | Critical elements in gantt |
| `--success-color` | Completed elements |

Dark mode is automatically detected and applied.

## Development

```bash
git clone https://github.com/pajew-ski/ha-mermaid.git
cd ha-mermaid
npm install
npm run dev   # Watch mode — rebuilds on changes
```

Copy `dist/ha-mermaid.js` to your HA `config/www/` directory and add it as a resource.

### Publishing a Release

1. Update version in `package.json` and `src/mermaid-card.ts`
2. `npm run build`
3. Commit and push
4. Create a GitHub Release with tag `vX.Y.Z`
5. The GitHub Action automatically attaches `ha-mermaid.js` to the release

### HACS Store Checklist

Before submitting to the [HACS default repository](https://github.com/hacs/default):

- [ ] Repository has a **description** set on GitHub
- [ ] Repository has **topics** set: `home-assistant`, `hacs`, `lovelace`, `mermaid`, `custom-card`
- [ ] At least one **GitHub Release** is published (not just a tag)
- [ ] `hacs.json` is valid and complete
- [ ] HACS validation workflow passes (all checks green)
- [ ] README contains installation and usage instructions

Set topics via GitHub CLI:
```bash
gh repo edit --add-topic home-assistant,hacs,lovelace,mermaid,custom-card,hacktoberfest
```

## License

[MIT](LICENSE)
