# DESIGN.md — Ashen Protocol
## KSP Intelligence Platform · Open Design System

---

## Project Context

A real-time crime analytics and intelligence dashboard for Karnataka State Police.
Deployed as a static Vanilla HTML5 SPA served from Zoho Catalyst Slate CDN.
No frameworks. No build step. No dependencies beyond CDN-loaded libraries.

**Aesthetic reference:** Palantir Gotham — dense, serious, real operational software.
**Rule:** Color exists only to encode data. Never for decoration.

---

## File Structure

```
client/
├── index.html    # layout shell + all section markup
├── main.css      # all tokens + styles
├── main.js       # fetch logic, Leaflet map, D3 network, chat UI
└── fonts.css     # @import declarations only — never regenerate this file
```

API base: `http://localhost:3000` (local dev) → `https://<catalyst-domain>/server/ashen_api` (prod)
Switch via `const API_BASE` at top of `main.js`.

---

## Typography

```css
/* fonts.css — do not regenerate */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');
```

| Role | Font | Weight | Size |
|---|---|---|---|
| Data values, IDs, timestamps, badges, labels | IBM Plex Mono | 400 / 500 | 9–18px |
| Body text, names, descriptions, nav | IBM Plex Sans | 400 / 500 | 11–14px |
| Section headers / panel titles | IBM Plex Mono | 500 | 9px uppercase + letter-spacing 0.1em |
| HUD stat numbers | IBM Plex Mono | 500 | 18–22px |

**Rule:** `font-family: 'IBM Plex Mono', monospace` for anything that is a number, code, ID, score, timestamp, badge, or label. `font-family: 'IBM Plex Sans', sans-serif` for everything else.

---

## Color Tokens

### Surface hierarchy (background layers — light to dark = raised to base)

```css
--bg-deep:    #0F1114;   /* topbar, sidebar — darkest */
--bg-base:    #13151A;   /* page background */
--bg-surface: #1C1E24;   /* panels, cards */
--bg-raised:  #24272E;   /* table rows, inputs */
--bg-hover:   #2E3340;   /* hover state */
```

### Text hierarchy

```css
--text-1: #C8CDD6;   /* primary — district names, values */
--text-2: #6B7280;   /* secondary — supporting info */
--text-3: #4B5261;   /* muted — labels, section headers */
--text-4: #3A4050;   /* ghost — column headers, timestamps */
--text-5: #2E3340;   /* disabled */
```

### Border

```css
--border:    rgba(255,255,255,0.05);   /* default separation */
--border-hi: rgba(255,255,255,0.09);   /* inputs, focused panels */
```

### Data states — ONLY for encoding crime/risk data, never UI chrome

```css
--danger:     #C64A4A;                  /* HIGH risk */
--danger-dim: rgba(198,74,74,0.15);     /* HIGH badge bg */
--warning:    #B8862A;                  /* MED risk */
--warning-dim:rgba(184,134,42,0.15);    /* MED badge bg */
--safe:       #3A8C5C;                  /* LOW risk */
--safe-dim:   rgba(58,140,92,0.15);     /* LOW badge bg */
```

### Map heat ramp — Leaflet circle markers only

```
Low density  → rgba(74, 32, 16, 0.55)
Mid density  → rgba(198,74, 26, 0.65)
High density → rgba(232,137,42, 0.75)
```

---

## Layout

```
┌─────────────────────────────────────────────────┐
│ TOPBAR (40px, bg-deep)                          │
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │  HUD STRIP (4 stat cards)            │
│ (180px   ├──────────────────────────────────────┤
│ bg-deep) │  MAP AREA (Leaflet, 240px tall)      │
│          ├──────────────────────────────────────┤
│          │  BOTTOM ROW (table left, chart right) │
└──────────┴──────────────────────────────────────┘
CHAT PANEL — fixed bottom-right corner overlay
```

- Page uses CSS Grid: `grid-template-columns: 180px 1fr`
- All sections separated by `1px solid var(--border)` — no box-shadows, no glows
- Border-radius on interactive elements: `4px` (inputs, badges) · `6px` (cards, panels)
- No glassmorphism. No gradients on UI chrome. No glow effects.

---

## Components

### Topbar
- Height: 40px · bg: `var(--bg-deep)` · border-bottom: `var(--border)`
- Left: `ASHEN / PROTOCOL · KSP INTELLIGENCE PLATFORM` in IBM Plex Mono 10px `var(--text-3)` letter-spacing 0.1em
- Right: live clock (IBM Plex Mono 10px `var(--text-4)`, updated every second via JS)

### Sidebar
- Width: 180px · bg: `var(--bg-deep)` · border-right: `var(--border)`
- Nav items: IBM Plex Sans 11px · inactive `var(--text-3)` · active `var(--text-1)` + `bg-raised` bg
- Filter inputs: IBM Plex Sans 10px · bg `var(--bg-raised)` · border `var(--border-hi)` · color `var(--text-2)`
- Section labels: IBM Plex Mono 9px uppercase `var(--text-4)` letter-spacing 0.1em

### HUD stat cards
- 4 equal columns · bg `var(--bg-base)` · separated by `1px var(--border)`
- Value: IBM Plex Mono 20px 500 `var(--text-1)` · only danger values use `var(--danger)`
- Label: IBM Plex Mono 8px uppercase `var(--text-4)` letter-spacing 0.08em

### Data table rows
- bg: `var(--bg-base)` · hover: `var(--bg-hover)` · selected: `var(--bg-raised)` + left border `2px var(--text-3)`
- Primary cell: IBM Plex Sans 11px `var(--text-1)`
- Sub cell (station code etc): IBM Plex Mono 9px `var(--text-4)`
- Data cells: IBM Plex Sans 11px `var(--text-2)`
- Score cells: IBM Plex Mono 11px `var(--text-2)`

### Risk badges
```html
<span class="badge high">HIGH</span>
<span class="badge med">MED</span>
<span class="badge low">LOW</span>
```
```css
.badge { font-family:'IBM Plex Mono'; font-size:9px; padding:2px 7px; border-radius:3px; }
.badge.high { background:var(--danger-dim); color:var(--danger); }
.badge.med  { background:var(--warning-dim); color:var(--warning); }
.badge.low  { background:var(--safe-dim); color:var(--safe); }
```

### Panel headers
- IBM Plex Mono 9px 500 uppercase `var(--text-3)` letter-spacing 0.1em
- padding: 8px 14px · border-bottom: `var(--border)`

### Map area
- bg: `#0C0E11` (slightly deeper than bg-deep for contrast)
- Leaflet dark tile: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- Circle markers use heat ramp based on incident count
- No custom map chrome — just the tile + circles

### D3 Network graph
- bg: `var(--bg-surface)`
- FIR nodes: rect 52×24px · border `1px solid var(--border-hi)` · fill `var(--bg-raised)` · text `var(--text-2)` Mono 9px
- Suspect nodes: circle r=8 · fill `var(--bg-hover)` · stroke `var(--border-hi)`
- Links: `stroke: var(--border-hi)` width 1 · dashed for cross-FIR links
- Hover tooltip: bg `var(--bg-surface)` border `var(--border-hi)` · IBM Plex Sans 11px

### Chat panel
- Fixed bottom-right · width 260px · bg `var(--bg-surface)` · border `var(--border-hi)` · border-radius 8px
- Toggle FAB: 36px square · bg `var(--bg-raised)` · border `var(--border-hi)` · icon `var(--text-2)`
- FAB active: bg `var(--bg-hover)`
- User messages: align-right · bg `var(--bg-raised)` · border `var(--border-hi)` · text `var(--text-1)` 11px
- AI messages: align-left · bg `var(--bg-surface)` · text `var(--text-2)` 11px
- Input: IBM Plex Sans 11px · bg `var(--bg-raised)` · border `var(--border)`
- Mic button: 28px · bg `var(--bg-raised)` · active state border `1px solid var(--danger-dim)` icon `var(--danger)`

---

## Interaction rules

- Hover transitions: `transition: background 0.12s ease` — nothing else
- No animations on load. No skeleton loaders. No spinners with glow.
- Loading state: replace value with `—` in same monospace style
- Error state: replace value with `ERR` in `var(--danger)` Mono
- Focus state on inputs: `border-color: var(--border-hi)` only — no glow, no box-shadow

---

## API integration (main.js)

```js
const API_BASE = 'http://localhost:3000'; // swap for prod

// Endpoints
GET ${API_BASE}/server/ashen_api/api/analytics/summary   → HUD cards + donut chart
GET ${API_BASE}/server/ashen_api/api/map/hotspots        → Leaflet circles
GET ${API_BASE}/server/ashen_api/api/network/graph?fir_number=  → D3 nodes/links
GET ${API_BASE}/server/ashen_api/api/predict/risk        → district table + badges
```

On fetch failure: show `ERR` in the relevant cell. No alert() calls. No console.error spam.

---

## Absolute rules (never violate)

1. No accent color on UI chrome — only data states use color
2. No box-shadow, no text-shadow, no glow, no glassmorphism

**Exception — full-screen modal overlays** (e.g. `#briefing-modal`): may use `backdrop-filter: blur()`, `box-shadow` on the modal card, and up to `8px` border-radius. Rationale: a full-viewport overlay dialog is not "UI chrome" in the Gotham grid sense — it's a distinct transient surface, and needs visual separation from the dashboard behind it. This exception is scoped to modal overlays only; dashboard cards/panels/badges/buttons remain flat per the rules above.
3. No font other than IBM Plex Mono and IBM Plex Sans
4. No animations except `transition: background 0.12s ease` on hover
5. No placeholder lorem ipsum — use real field names and realistic KSP data
6. Leaflet and D3 loaded from CDN only — no npm, no bundler
7. Every interactive element must have a visible hover state
8. Chat panel is an overlay — never pushes layout
9. Mobile layout is out of scope — desktop only, min-width 1024px
