# Mermaid Diagram Card for Home Assistant

[![HACS Badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/pajew-ski/ha-mermaid)](https://github.com/pajew-ski/ha-mermaid/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A custom Lovelace card that renders **Mermaid diagrams** natively in Home Assistant — with full theme integration so diagrams look like a natural part of your dashboard.

![Example](https://mermaid.js.org/img/header.png)

## Features

- **All Mermaid diagram types**: flowchart, sequence, gantt, class, state, ER, pie, mindmap, timeline, quadrant, sankey, XY chart, block, and more
- **Automatic theming**: Diagrams inherit your HA theme colors, fonts, and style — light or dark mode
- **Entity templating**: Use `${states['sensor.temperature']}` in your diagram to show live entity values
- **Visual card editor**: Configure everything from the UI — no YAML required
- **Responsive**: Diagrams scale to fit the card width
- **Accessible**: Semantic SVG output with proper contrast ratios

## Installation

### HACS (Recommended)

1. Open **HACS** in your Home Assistant instance
2. Click the three dots menu → **Custom repositories**
3. Add `https://github.com/pajew-ski/ha-mermaid` with category **Lovelace**
4. Click **Install**
5. Refresh your browser (Ctrl+F5)

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

| Option      | Type   | Default | Description                                           |
| ----------- | ------ | ------- | ----------------------------------------------------- |
| `content`   | string | **required** | Mermaid diagram code                             |
| `title`     | string | —       | Card title                                            |
| `theme`     | string | `auto`  | `auto`, `default`, `dark`, `forest`, or `neutral`     |
| `card_size` | number | 4       | Card height in the dashboard grid (1-20)              |

### Entity Templating

Use live entity values in your diagrams:

```yaml
type: custom:mermaid-card
title: Climate Overview
content: |
  graph LR
    T["🌡️ Temperature: ${states['sensor.temperature']}°C"]
    H["💧 Humidity: ${states['sensor.humidity']}%"]
    P["📊 Pressure: ${attr('sensor.weather', 'pressure')} hPa"]
    T --> H --> P
```

**Template syntax:**

| Syntax | Description |
| ------ | ----------- |
| `${states['entity_id']}` | Entity state value |
| `${attr('entity_id', 'attribute')}` | Entity attribute |
| `${state_attr('entity_id', 'attr')}` | Alias for `attr()` |

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

## License

[MIT](LICENSE)
