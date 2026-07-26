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
