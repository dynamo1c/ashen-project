# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ashen Protocol is a crime analytics intelligence dashboard for Karnataka State Police (KSP Datathon 2026 submission), deployed on Zoho Catalyst. It has two halves:

- **`client/`** — a zero-build, zero-framework SPA (vanilla HTML/CSS/JS) styled after a Palantir Gotham command-center aesthetic. Leaflet (GIS maps), D3.js v7 (accomplice network graphs), and Chart.js are loaded via CDN — no npm packages, no bundler.
- **`functions/ashen_api/`** — a Zoho Catalyst Advanced I/O serverless function: a single Express app (`index.js`) that queries a Zoho Catalyst Relational Data Store via ZCQL and hosts an LLM-driven "copilot" chat agent.

Read `ASHEN_PROTOCOL.md` for the full data pipeline / schema / feature history, and `DESIGN.md` for the exhaustive visual design system (colors, typography, component specs) before touching any frontend styling — it encodes hard rules (e.g. "color only encodes data, never decoration", no box-shadows/glow/gradients, max 6px border-radius).

## Commands

Run everything from the repo root.

```bash
npm install                 # postinstall hook also runs `npm install` inside functions/ashen_api
npm start                   # or: npm run dev — cd's into functions/ashen_api and runs node index.js
start.bat                   # Windows convenience launcher; installs deps if missing, starts server on :3000
```

There is no build step, bundler, test runner (jest/mocha), or linter configured in this repo. "Tests" are ad-hoc diagnostic scripts run directly with Node against live credentials:

```bash
node functions/ashen_api/test_query.js      # sanity-checks ZCQL queries against the live Catalyst datastore
node functions/ashen_api/test_api_key.js    # verifies GEMINI_API_KEY works against the Gemini REST endpoint
```

Zoho Catalyst CLI (deploys `functions/` + `client/` per `catalyst.json`, project config in `.catalystrc`):

```bash
catalyst serve   # local Catalyst emulation (also runnable as `npm run catalyst`)
catalyst deploy  # deploy to the ashenprotocol Catalyst project
```

The server serves the client too — once running, the dashboard is at `http://localhost:3000/` and the API at `http://localhost:3000/api/*` (locally) or `https://<catalyst-domain>/server/ashen_api/api/*` (prod; a middleware in `index.js` strips the `/server/ashen_api` prefix transparently). `client/main.js` picks `API_BASE` automatically from `window.location.origin`.

**`.build/functions/ashen_api/`** is a generated mirror of `functions/ashen_api/` (Catalyst's build output) — never edit files there; edit the source under `functions/ashen_api/` instead.

## Environment

`.env` at the repo root (and a duplicate `functions/ashen_api/.env`) is loaded manually at startup by a bespoke `loadEnv()` walker in `index.js` (searches up to 6 parent dirs from `__dirname`/`cwd`) since this runs outside a bundler. Relevant keys:

- `LLM_PROVIDER` — `cerebras` (default, active) or `gemini` (dormant, fully wired but unused unless switched)
- `CEREBRAS_API_KEY` — required at startup when `LLM_PROVIDER=cerebras`; the app throws immediately if missing/placeholder
- `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID` — used only when `LLM_PROVIDER=gemini`
- `TAVILY_API_KEY` — optional; enables real web search grounding for the copilot, otherwise falls back to a simulated local intelligence feed
- `QUICKML_KEY_*` (per-district), `DEEPSEEK_API_KEY` — present in `.env` but not currently wired into `index.js`

## Architecture

### Backend (`functions/ashen_api/index.js` — single file, ~3200 lines)

All routes and logic live in this one Express file (plus small helper modules `anomaly_engine.js` and `cerebrasClient.js`). Key sections, top to bottom:

1. **Env/startup**: manual `.env` loader, `LLM_PROVIDER` gate, static client-serving with SPA fallback (any non-`/api` GET returns `client/index.html`).
2. **`flattenResults()`**: every ZCQL query result must be passed through this — Catalyst returns rows nested under the table name (`[{ FIR_Records: {...} }]`) and this flattens them to plain objects. Always use it after `executeZCQLQuery`.
3. **`toRiskScored(score, level, lastUpdated)`**: shared helper that normalizes a numeric score into the `{ riskScore, riskLevel, lastUpdated }` shape used across the network graph, risk table, and recidivism endpoints. Thresholds: `>=70 HIGH`, `>=35 MED`, else `LOW`.
4. **`injectFIRRecord()`**: writes a new FIR (+ optional suspect) row, generating a `KA-<DISTRICT_CODE>-<YEAR>-<seq>` FIR number and an `OFF-<######>` offender ID. Suspect identity resolution: looks up existing `Offenders` by name first so repeat offenders reuse the same `offender_id` (name is display-only; `offender_id` is the stable identity key everywhere — network graph nodes, recidivism cohorts, etc. all key off it).
5. **Analytics/read routes** (`/api/analytics/summary`, `/api/map/hotspots`, `/api/network/graph`, `/api/predict/risk`, `/api/analytics/anomalies`, `/api/analytics/briefing`, `/api/analytics/recidivism`, `/api/analytics/mo-matches`, `/api/syndicates[/:id]`) — **every one of these follows a try-datastore-then-fallback-to-realistic-mock pattern**: attempt the real ZCQL query, and on any failure (or empty local dev DB) silently fall back to hardcoded/generated sample data shaped exactly like the real response. This is intentional (keeps the frontend/demo working without a live DB) — when modifying a route, preserve the fallback branch and keep its shape in sync with the real-query branch.
6. **Write routes**: `POST /api/fir/inject` (calls `injectFIRRecord`), `GET /api/admin/backfill` (one-off CSV utility, see `backfill_offenders.py` for the standalone equivalent).
7. **MO-similarity engine**: a hand-rolled TF-IDF + cosine-similarity implementation (`tokenize`/`computeTF`/`computeCosineSimilarity`) powering `/api/analytics/mo-matches` — no external NLP library.
8. **Copilot agent loop** (`/api/copilot/query`, `/api/chat/query`): a two-stage Coordinator→Reasoner tool-calling agent, duplicated for each provider:
   - `runCerebrasAgent()` (active path, OpenAI-formatted tool schemas, single `gpt-oss-120b` model plays both roles, capped at 5 loop turns) — this is the one actually used since `LLM_PROVIDER` defaults to `cerebras`.
   - `runGeminiAgent()` (dormant, `gemini-2.5-flash` Coordinator + `gemini-2.5-pro` Reasoner via native `FunctionDeclaration`s and REST calls, also 5-turn cap) — kept fully functional behind the provider switch; don't delete it.
   - Both call the same underlying tool functions: `get_fir_stats`, `get_district_risk_score`, `get_crime_trend`, plus network/web-search tools. `executeWebSearchTool()` uses Tavily if `TAVILY_API_KEY` is set, else a simulated local feed.
   - `handleQueryRequest()` is the shared entry point both `/api/chat/query` (GET) and `/api/copilot/query` (POST) delegate to; it branches on `LLM_PROVIDER` and has its own simpler keyword-based fallback (district/crime-type count queries, suspect name lookup) if the LLM agent call fails entirely.

Because the Coordinator/Reasoner pipeline and every analytics route are duplicated across a real-DB path and a fallback path, when adding a field or changing a response shape, grep for all read sites of that field (frontend `main.js`, both mock and live branches) rather than editing just one branch.

### Frontend (`client/`)

- **`index.html`** — full DOM shell for all views (Dashboard, GIS Map, Network, Alerts); view switching is done by toggling classes on `.app-body` (CSS-grid-driven, see `main.css`), not by swapping DOM trees.
- **`main.js`** (~3100 lines) — single controller script: fetch calls to the API, Leaflet map init + marker clustering, D3 force-directed graph, Chart.js donut, chat/copilot panel, voice search wiring. Tracks chart instances in outer scope and destroys them before re-binding to avoid Chart.js "canvas in use" errors — follow this pattern for any new Chart.js usage.
- **`voiceSearch.js`** — `AshenVoiceSearch`, a thin wrapper around the browser Web Speech API (`en-IN`/`hi-IN`/`kn-IN` language chips).
- **`main.css`** — all design tokens and component styles; **`fonts.css`** — `@import` only, never regenerate.
- No React/Vue, no JSX, no build step — edit these files directly and reload the browser.

### Database schema (Zoho Catalyst Data Store, queried via ZCQL)

Three tables — see `ASHEN_PROTOCOL.md` for full column lists:
- **`FIR_Records`** (PK `fir_number`): incident records, bounded to 5 districts (Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi) with lat/long constrained to Karnataka's bounding box.
- **`Offenders`** (PK `offender_id`, FK `associated_fir_number` → `FIR_Records`): suspect profiles; `offender_id` is the stable identity used for repeat-offender/recidivism linking, `offender_name` is display-only and not unique.
- **`District_Risk_Scores`** (PK `record_id`): monthly per-district incident counts + forecasted risk level.

Seed/data-generation scripts at the repo root (`generate_firs.py`, `triage_and_clean.py`, `verify_data.py`, `aggregate_monthly.py`, `inject_timeseries_patterns.py`, `prepare_pipeline_datasets.py`, `backfill_offenders.py`) are one-off Python utilities used to build and validate the seeded CSVs (`fir_records_seed.csv`, `offenders_seed.csv`, `district_risk_scores_seed.csv`) — they operate on flat files, not the live datastore, and are not part of the request-serving path.
