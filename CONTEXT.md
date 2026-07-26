# Ashen Copilot Handoff Context

## Project Overview
Ashen Protocol is a crime analytics intelligence dashboard built for KSP Datathon 2026, deployed on Zoho Catalyst. 
It features:
- **Web SPA**: Vanilla HTML/JS with Leaflet maps and D3 network graphs following a Palantir Gotham theme (charcoal, monochrome data presentation).
- **Backend Function**: `ashen_api` Express app querying a Zoho Catalyst Relational Data Store.

## Model Layer
- **Active Provider**: Cerebras Cloud (`LLM_PROVIDER=cerebras` by default). Both the Coordinator and Reasoner roles collapse to use the ultra-fast `gpt-oss-120b` model.
  - *Coordinator*: Performs a multi-step tool-calling loop (capped at 5 turns) using OpenAI-formatted schemas to query database stats, trends, and risk scores, or trigger web searches.
  - *Reasoner*: Synthesizes gathered data and web citations into the final strategic Palantir Gotham-inspired intelligence report.
  - *Web Grounding*: Handled via custom `web_search(query)` tool. Runs Tavily Search if `TAVILY_API_KEY` is configured, else falls back to simulated intelligence feeds.
- **Dormant Provider**: Gemini (`LLM_PROVIDER=gemini`). Uses `gemini-2.5-flash` (coordinator with built-in grounding tool) and `gemini-2.5-pro` (reasoner with thinking budget). All code paths, REST loops, and helper methods remain intact and can be activated by toggling `LLM_PROVIDER` in `.env`.

## Audit & Correctness Pass (June 2026)
- **Startup Performance**: Removed the programmatic `npm install` execution loop from `index.js`. Dependencies are now statically resolved via `node_modules` during the build/deploy step to prevent large cold-start request latency in the serverless environment.
- **Frontend Chart.js Memory Leak & Conflict Fix**: Modified `client/main.js` to track the active `crimeChartInstance` in the outer scope and destroy the previous Chart instance before binding a new one. This prevents duplicate chart bindings and visual hover flickering when reloading dashboard statistics.
- **Humanization & Cleanup**: Audited file logs, commented-out debug values, and copy-paste comments across the codebase to ensure consistency.

## Pre-Submission Hardening & Polish (July 2026)
- **Data provenance**: every analytics route now sets an `X-Data-Source: live|mock|mixed` response header; frontend reads it and shows a "SAMPLE DATA" badge on the affected panel (dashboard HUD, map, network graph, risk table, anomaly radar, recidivism matrix, MO matches, syndicate dossier, briefing modal). Syndicates/anomalies routes have no live datastore path at all, so their badges are effectively permanent until those routes get a real query.
- **Vendored CDN libs**: Leaflet, Leaflet.markercluster, leaflet.heat, D3, Chart.js, and Tabler Icons (incl. marker/layer images and webfont files) now live under `client/vendor/` and are referenced with relative paths — zero CDN calls at runtime, confirmed via network log.
- **Input validation**: `POST /api/fir/inject` now validates district/police_station/crime_head/mo_description/offender_name/age/gender before touching `injectFIRRecord`, returning 400 with a `details` array on failure (`validateFirInjectPayload` in `index.js`).
- **Rate limiting**: hand-rolled in-memory fixed-window limiter (`rateLimit()` in `index.js`, no new dependency) caps `/api/chat/query` and `/api/copilot/query` at 20 req / 5 min per IP, returns 429 + `Retry-After`; frontend chat/voice panels show a friendly rate-limit message instead of a generic error.
- **MO-matches narrative consistency fix**: the mo-matches fallback simulation used to pick a random crime category when the FIR wasn't found in the datastore, producing narratives that didn't match the case being viewed (e.g. a Cybercrime case showing "physical assault" MO matches). Frontend now passes the case's `crime_head` as a query param; backend's `mapToMoCategory()` uses it instead of a random pick.
- **Golden-path demo scenario**: Map (Bengaluru Urban, Cybercrime hotspot `KA-BEN-2026-0002`) → Network Graph (fallback network always attaches the same Imran Khan / Pradeep Naik / Sunil Gowda / Ramesh Kumar syndicate story regardless of FIR) → Case Dossier (MO matches now consistent) → Anomaly Radar (same Bengaluru Urban Cybercrime CRITICAL surge) → Strategic Briefing. Verified end-to-end with zero console errors.
- **Guided Tour mode**: "Guided Tour" sidebar button opens a 7-step coach-mark overlay (`#tour-overlay` in `index.html`, `TOUR_STEPS` in `main.js`) that drives the app through the golden path above automatically — Back/Next/Exit all verified.
- **Methodology & Model Card pages**: new standalone static pages `client/methodology.html` (z-score formula, recidivism cohort definitions, TF-IDF cosine similarity math) and `client/model-card.html` (decision-support disclaimer, known limitations, bias/false-positive behavior), linked from the sidebar footer. Both are honest about current-build limitations — e.g. the anomaly z-scores are a fixed demo dataset, not a live rolling computation, and most recidivism risk scores are `Math.random()`-generated placeholders when the live datastore isn't populated.
- **Error-state fixes**: `openCaseDossierPage`'s network-graph fetch no longer fabricates a fake "Rajesh Kumar" suspect on failure — shows a real error message instead. `loadRiskTable` and `loadSyndicatesList` now show explicit empty-state messages instead of a silently blank table. `openBriefing` shows explicit empty-state text if the LLM returns no markdown.
- **Confirmed non-issues**: the "[Notice] Using fallback..." log spam + "Shutting down server" the user reported is normal per-request fallback logging (local dev has no live Catalyst datastore) plus the previously-diagnosed `catalyst serve` CLI watcher-restart quirk — not a code bug, no fix needed.
