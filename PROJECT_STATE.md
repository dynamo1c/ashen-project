# Project State — Ashen Copilot

## Current Session Milestones
- [x] Revert from DeepSeek to Gemini Flash + Pro.
- [x] Investigate existing database routes and design custom tools.
- [x] Define custom tools (`get_fir_stats`, `get_district_risk_score`, `get_crime_trend`, `trace_accomplices`, `file_fir`, `fetch_intelligence_feed`) as Gemini `FunctionDeclaration`s.
- [x] Build the native function-calling execution loop in `ashen_api` with sequential execution, parallel multi-tool output handling, and robust error trapping.
- [x] Resolve combined tools constraint: Exclude `google_search` from the Coordinator (Flash) tools array so it handles internal DB query tools exclusively, and allocate `google_search` grounding exclusively to the Reasoner (Pro) to gather external context.
- [x] Synthesize diagnostic data using the delegated reasoner (`gemini-2.5-pro`) in active thinking mode, receiving the coordinator's gathered facts and citations.
- [x] Polish UI chat terminal prompts (typing indicator `[ANALYZING DATABASE...]`) and formatted clickable Markdown citation links.
- [x] Migrate active LLM provider from Gemini to Cerebras Cloud (`gpt-oss-120b` for both Coordinator and Reasoner roles).
- [x] Implement robust startup check verifying `CEREBRAS_API_KEY` presence.
- [x] Add provider switch (`LLM_PROVIDER` default: `cerebras`) to gate the reasoning loop routing.
- [x] Port database schemas to OpenAI-compatible structure and adjust native tool execution loop.
- [x] Implement external web search fallback using the Tavily REST API when present, defaulting to local simulated feed search.
- [x] Complete codebase audit, correctness, and humanization pass.
- [x] Remove startup child process `npm install` from Express API backend to resolve serverless latency.
- [x] Correct D3 and Chart.js frontend canvas initialization bugs to resolve "canvas in use" errors.
- [x] **Harden Semantic Ontology Schema (June 2026):**
  - [x] Resolve recidivist path stable `offender_id` identity keys (name is display only).
  - [x] Audit co-offending dynamic queries to confirm derived link relationships.
  - [x] Refactor suspect and district risk models to map into the unified `toRiskScored` shape.
  - [x] Create deterministic `backfill_offenders.py` utility for in-place database seeding.
  - [x] Update frontend D3 node keys to map to `offender_id` to support repeat suspects.
  - [x] Maintain full compatibility with active Cerebras agent tools and Zoho Catalyst Datastore structure.
- [x] **Live Voice Search Integration (July 2026):**
  - [x] Created browser-native Web Speech API wrapper `AshenVoiceSearch` inside `client/voiceSearch.js`.
  - [x] Structured language chips (`en-IN`, `hi-IN`, `kn-IN`) and dynamic `#voice-status` indicator in `client/index.html`.
  - [x] Styled active recording pulse animations and badges following the Palantir Gotham design rules in `client/main.css`.
  - [x] Refactored backend Express endpoints in `functions/ashen_api/index.js` to expose a DRY `POST /api/copilot/query` route.
- [x] **Recidivism Matrix Scale & Redirection Polish (July 2026):**
  - [x] Scaled datastore query limit from `LIMIT 100` to `LIMIT 2000` to handle large-scale database lookups.
  - [x] Implemented dynamic seed generation up to exactly 1,480 profiles to demonstrate full visual scale while retaining any real database modifications.
  - [x] Refactored scatter chart and table dossier links to pass the complete profile object, resolving fallback placeholders on the dossier page.

