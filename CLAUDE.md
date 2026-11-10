# ha-mermaid - Home Assistant Mermaid Diagram Card

## Project Overview
A HACS-compatible custom Lovelace card for Home Assistant that renders Mermaid diagrams with full theme integration.

## Architecture
- **Language**: TypeScript with LitElement
- **Bundler**: Rollup (single JS output to `/dist/`)
- **Runtime**: Mermaid.js is bundled (no CDN dependency)
- **Card Type**: `custom:mermaid-card`
- **Editor**: Visual config editor with code textarea and options

## Directory Structure
```
src/
  mermaid-card.ts      - Main card component (LitElement)
  editor.ts            - Visual config editor component
  types.ts             - TypeScript interfaces
  styles.ts            - CSS styles with HA theme variables
  theme-mapper.ts      - Maps HA CSS variables to Mermaid theme config
  template-renderer.ts - Template expression parser (allowlist) and value masking
  card-logic.ts        - Pure card helpers (render-error fallback, node actions), unit-tested
test/
  *.test.mjs           - node:test suites, import the .ts sources directly (Node type stripping)
dist/
  ha-mermaid.js        - Built bundle (committed for HACS)
```

## Build Commands
```bash
npm install          # Install dependencies
npm run build        # Production build
npm run dev          # Watch mode for development
npm run lint         # ESLint check
npm test             # Version consistency check, then unit tests in test/ (Node >= 22.18)
```

## Key Design Decisions
1. **Mermaid bundled, not CDN**: Reliability, offline support, version control
2. **HA theme mapping**: CSS variables extracted at render time via `getComputedStyle()` and mapped to Mermaid's `themeVariables`
3. **Template support**: `${states['sensor.temperature']}` syntax in diagram code, resolved from `hass.states`
4. **Lazy init**: Mermaid.initialize() called once, diagrams rendered via mermaid.render()
5. **Card editor**: LitElement-based editor with textarea for diagram code + dropdowns for options

## Testing
- `npm test` runs `test/*.test.mjs` with `node:test`; modules under test must only use `import type` so Node can load them without a build
- Template regression cases in `test/template-renderer.test.mjs` pin the output of every README example; keep them green
- Manual testing in Home Assistant dev environment
- Load card via Resources > JavaScript Module > `/local/ha-mermaid.js`

## Versioning
- `package.json` is the only place the version is written. `src/mermaid-card.ts` imports it; never hardcode a version string in `src/`.
- Bump with `npm version X.Y.Z --no-git-tag-version`, rebuild, run `npm test`, then release with tag `vX.Y.Z`.
- The release workflow refuses to attach the asset when the tag and `package.json` disagree.

## HACS Requirements
- `hacs.json` in repo root with render_readme: true
- Built JS in `/dist/ha-mermaid.js`
- GitHub releases with asset attached

## Theme Variable Mapping
HA variables like `--primary-color`, `--primary-text-color`, `--ha-card-background` are read via `getComputedStyle()` and passed to Mermaid's `themeVariables` config (primaryColor, primaryTextColor, etc.).

## Coding Conventions
- Use LitElement patterns (html``, css``, property decorators)
- Keep components focused and single-responsibility
- Handle errors gracefully with user-visible messages in the card
- All user-facing strings should be clear and helpful
