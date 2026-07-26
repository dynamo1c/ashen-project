# ⚔️ ASHEN PROTOCOL
### KSP Datathon 2026 — Project Master Reference & Status Document
> *"From scattered data and dormant patterns, truth is drawn forth. Such is thy sworn purpose — Ashen Protocol."*

---

## 📋 EVENT INFORMATION

| Field | Details |
|---|---|
| **Event** | KSP Datathon 2026 |
| **Organizer** | Karnataka State Police + H2S (Hack2Skill) |
| **Format** | Free | In Person |
| **Submission Deadline** | 19th July 2026 |
| **Prize Pool** | ₹10,00,000 (zero-equity, non-dilutive) |
| **Platform** | hack2skill.com |
| **Support** | datathon2026support@hack2skill.com | +919870330830 |
| **Technology Partner** | Zoho Catalyst (mandatory deployment) |
| **Team Name** | Ashen Protocol |
| **Team Size** | Solo |

---

## 🎯 PROJECT GOAL & VISION

The KSP Command Center Dashboard (**Ashen Protocol**) is a high-density, serious, operational intelligence platform designed for the Karnataka State Police (KSP) to visualize and analyze crime records and offender networks. 

### Core Vision:
- **Challenge 1 — Intelligent Conversational AI Interface**: A natural language query chatbot overlay linking straight to the relational database to return instant statistical answers (e.g. crime counts by district, suspect history searches) in English, with mic interface hooks for voice input.
- **Challenge 2 — AI-Driven Crime Analytics & Visualization Platform**: An advanced GIS geospatial density map, D3.js interactive accomplice network graphs, spatiotemporal forecasts, and suspect-to-incident relation tracking.
- **Aesthetic Direction**: **Palantir Gotham** — dense, professional command-center theme. Minimalist UI chrome where color is strictly reserved for data encoding (high, medium, low risk states or hotspot density), using high-readability monospace font hierarchies (`IBM Plex Mono` for values and identifiers, `IBM Plex Sans` for body text/names), and zero ornamental shadows or decorative gradients.
- **Architecture**: A zero-bloat Single Page Application (SPA) utilizing a Vanilla HTML5/CSS/JavaScript layout paired with a Zoho Catalyst Advanced I/O Node.js Serverless Backend.

---

## 🏗️ TECHNICAL STACK

| Layer | Technology |
|---|---|
| **Web Frontend** | Static Vanilla HTML5, CSS Grid Layouts, ES6 Vanilla JS (No frameworks, no build step, zero-overhead Slate CDN hosting) |
| **GIS Mapping** | Leaflet.js (dark tiles, dynamic density circles & custom Palantir-styled marker clustering) |
| **Accomplice Visualizer**| D3.js v7 Force-Directed graphs (case-to-suspect linkages) |
| **Backend API** | Zoho Catalyst Advanced I/O Serverless Functions (Node.js 18 + Express) |
| **Relational DB** | Zoho Catalyst Data Store (seeded with 75k FIR records and 100k suspects) |
| **Query Engine** | Zoho Catalyst ZCQL (Catalyst Query Language) |

---

## 📦 DATA PIPELINE & COMPILATION
To validate our system with enterprise-scale loads, we triaged real-world 2023 NCRB statistics using Python scripts to generate a distribution-accurate dataset:
1. **NCRB Profile Ingestion (`triage_and_clean.py`)**: Analyzed raw Bengaluru Metropolitan crime logs to compile category and gender statistics, outputting `data/processed/bengaluru_crime_seed.json`.
2. **Faker Generator (`generate_firs.py`)**: Scaled the distributions up to **75,000 incident logs** (`FIR_Records`) and **100,000 offender profiles** (`Offenders`), bounding coordinates strictly within Karnataka boundaries.
3. **Data Quality Verification (`verify_data.py`)**: Enforced constraints:
   - Coordinates constrained within Karnataka box: `11.5°N to 18.5°N` latitude and `74.0°E to 78.5°E` longitude.
   - Assured co-offending networks: roughly ~20% of FIRs map to multiple suspects to create meaningful crime networks.
   - Recidivism paths: repeat offenders appear across different case numbers to establish connected nodes.
   - Zero nulls and unique primary keys on all tables.

---

## 🗄️ DATABASE SCHEMA (Catalyst Data Store)

The relational schema is configured in the Catalyst Console across 3 primary tables:

### 1. `FIR_Records` Table
* **`fir_number`** (PK, VarChar) — Unique case identifier (e.g. `KA-BGU-2023-000002`)
* **`incident_timestamp`** (VarChar) — Date and time of incident
* **`district`** (VarChar) — Bounded to Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi
* **`police_station`** (VarChar) — Designated regional police station
* **`crime_head`** (VarChar) — Categorized offense head
* **`mo_description`** (VarChar/Text) — Modus Operandi narrative
* **`latitude`** (Double) & **`longitude`** (Double) — Spatial coordinate offsets

### 2. `Offenders` Table
* **`offender_id`** (PK, VarChar) — Unique suspect registration ID
* **`associated_fir_number`** (FK -> `FIR_Records.fir_number`, VarChar) — Linked case number
* **`offender_name`** (VarChar) — Suspect name
* **`age`** (Int) & **`gender`** (VarChar) — Demographics
* **`base_risk_score`** (Double) — Calculated recidivism danger score (0.0 to 100.0)

### 3. `District_Risk_Scores` Table
* **`record_id`** (PK, VarChar) — Unique record identifier
* **`district`** (VarChar) — Target district
* **`statistical_month`** (Int) & **`statistical_year`** (Int) — Period indicators
* **`base_incident_count`** (Int) — Total raw incidents recorded
* **`predicted_risk_level`** (VarChar) — Forecasted category (HIGH, MED, LOW)

---

## 🔧 BACKEND — CATALYST SERVERLESS API
The backend code in `functions/ashen_api/index.js` executes queries using the Zoho Catalyst SDK and filters results to resolve database constraints.

### Core Backend API Endpoints:
1. **`GET /api/analytics/summary`**: Queries total FIRs, offenders, and categorizes offense types into dashboard categories (*Theft & Property, Cybercrime, Narcotics & Excise, Violent Crimes, Financial Crimes, other*).
   - *ZCQL aggregate fix*: Extracts count values via `COUNT(fir_number)` and `COUNT(offender_id)` from nested rows, resolving aggregate parsing limits.
2. **`GET /api/map/hotspots?district=<name>`**: Projects `fir_number`, `district`, `latitude`, `longitude`, `crime_head`, and `incident_timestamp` from the database. Uses a strict query limit of `300` to satisfy Zoho Catalyst row constraints while maintaining light client-side payloads.
3. **`GET /api/network/graph?fir_number=<id>`**: Performs accomplice node mapping. Resolves co-offending links and recidivism paths using a two-step optimized query chain (bypassing heavy table joins) to output nodes and links for D3.js.
4. **`GET /api/predict/risk`**: Queries monthly aggregated forecasts ordered by date to populate spatiotemporal grids.
5. **`GET /api/chat/query?q=<query_string>`**: Our dynamic natural language query router. Parses queries for keyword filters (districts, crime categories, suspect profiles), runs the corresponding ZCQL statements, and returns dynamic statistical reports.

---

## 🌐 FRONTEND — SPA VISUALIZATION INTERFACE
The web client resides in `client/` and loads Leaflet, D3, Chart.js, and Tabler Icons via CDNs before running a unified controller script.

### Key Features:
- **SPA Views Grid Layout**: Tab toggles in the sidebar dynamically switch classes on `.app-body`, adjusting grid templates via main.css:
  - `Dashboard`: Full screen layout with HUD, map, bottom forecast, and network trace panels.
  - `GIS Map`: Fades HUD and bottom panels, expanding the Leaflet map to 100% viewport.
  - `Network`: Hides HUD and map, expanding the D3 canvas panel to full size.
  - `Alerts`: Focuses on the District Risk Forecast table, hiding the network visualizer.
- **Leaflet Mapping (Heatmap & Clusters)**:
  - *Heatmap*: Computes circle markers with color codes reflecting geographic coordinate densities.
  - *Clusters*: Implements `L.markerClusterGroup` with custom Palantir dark overlays (`var(--bg-surface)` bubble background, colored borders reflecting warnings/danger states).
  - *Popup Actions*: Maps popups showing real case details, including a `[TRACE]` link that triggers network searches.
- **D3 accomplice Graph with Suggestion Chips**: 
  - Dynamic Suggestion chips: Selects 4 random FIR numbers from loaded hotspots on startup and places them in the Network panel as clickable buttons.
  - Generates force-directed node-link graphs displaying gang relationships. Supports node dragging, collision checks, hover tooltips, and click-to-retrace events on case nodes.
- **Dynamic AI Assistant Chatbot**:
  - Toggles a sliding panel from the chat FAB.
  - Submits queries directly to `/api/chat/query` to fetch real database statistics.
  - Supports mic input buttons toggled to active state borders.

---

## 📅 Completed Project Sprint Timeline

### 🏁 Phase 1: Data Ingestion & Generator Engine (Days 1–10)
- [x] Ingest raw NCRB 2023 CSV datasets.
- [x] Filter, clean, and extract Bengaluru-specific crime statistics profiles.
- [x] Build Python generator (`generate_firs.py`) incorporating real-world NCRB seed distributions.
- [x] Generate 75,000 realistic records and validate constraints (Karnataka boundaries, 20% gang rates, recidivism, PK uniqueness) via `verify_data.py`.

### 🏁 Phase 2: Schema Design & Catalyst Database Setup (Days 11–18)
- [x] Plan the normalized 3-table schema (FIRs, Offenders, District Risks) on Catalyst.
- [x] Initialize Zoho Catalyst cloud project `ashenprotocol`.
- [x] Create relational tables in Zoho Catalyst Data Store and seed the 75k records.

### 🏁 Phase 3: Serverless Backend & API Layer (Days 19–25)
- [x] Initialize the `ashen_api` Node.js Advanced I/O function folder.
- [x] Build the Express.js server router with all four analytical endpoints.
- [x] Fix SDK query execution bugs by transitioning to ZCQL v2 `catalystApp.zcql().executeZCQLQuery(query)`.
- [x] Bypass Catalyst CLI global path bugs by mapping local configuration files (`catalyst-config.json` and Node bindings).
- [x] Test the endpoints locally and deploy the backend successfully to the cloud console.

### 🏁 Phase 4: HTML5 Frontend & Visualizations (Days 26–32)
- [x] Set up SPA dashboard layout shell in `client/index.html` referencing Gotham aesthetics.
- [x] Implement token declarations, CSS grid coordinates, and custom popup styles in `client/main.css`.
- [x] Code live clock ticks, Chart.js donut rendering, Leaflet maps initialization, and D3 canvas graphs in `client/main.js`.
- [x] Wire district table row clicks to smoothly trigger map panning and zooming.

### 🏁 Phase 5: Production Polish & QA Verification (Days 33–37)
- [x] Fix aggregate count retrieval bugs inside `/api/analytics/summary` by targeting `COUNT(fir_number)` keys.
- [x] Expand projected fields in hotspots queries to include `fir_number` and `district` columns.
- [x] Implement view class togglers and Leaflet resize invalidations on sidebar clicks.
- [x] Embed CDNs for Leaflet.markercluster, implement `L.markerClusterGroup`, and override marker bubble colors.
- [x] Code dynamic suggestion chips selection in `client/main.js` from fetched hotspot objects.
- [x] Replace mock responses in chatbot overlay with dynamic fetches targeting the backend `/api/chat/query` endpoint.
- [x] Execute end-to-end user flows in local browser emulator, capturing validation snapshots.

### 🏁 Phase 6: Submission Prep (Days 38–39)
- [x] Lock down configuration bindings.
- [x] Update project master reference documents.
- [x] Compile walkthrough summaries and validation reports.

---

## ✅ FINAL FEATURE CHECKLIST STATUS

### Challenge 1 — Conversational AI
- [x] Natural language chatbot (English relational query parser)
- [x] Dynamic backend query router (/api/chat/query)
- [x] Dynamic database-backed response generation
- [x] Real-time suspect profiles search (name lookups)
- [x] Case statistics aggregation via chatbot (district counts & crime category counts)
- [x] Microphone speech-to-text toggling UI representation

### Challenge 2 — Crime Analytics
- [x] Interactive HUD analytics overview (75k FIRs, 100k Suspects, 20k Gang Links)
- [x] Chart.js category crime distribution breakdown
- [x] Custom HTML dashboard legends grid
- [x] Leaflet.js dark tile geospatial maps
- [x] Map hotspot density circles
- [x] Custom Palantir-styled Leaflet Marker Clustering (heatmap to clusters layer toggle)
- [x] Clickable map popups showing real case details
- [x] Click-to-trace links in map popups
- [x] Dynamic trace suggestions chips (auto-generated from hotspots feed)
- [x] D3.js force-directed criminal network node-link graph
- [x] D3 Node drag handlers, collision spacing, hover tooltips, and click retraces
- [x] Recidivism tracking (suspect links between different case files)
- [x] Co-offending mapping ( gang links formed via shared case IDs)
- [x] Statistical risk level forecasting table sorted by danger weight
- [x] Smooth cinematic flyTo panning from risk table selections to map regions
- [x] Real-time sidebar inputs filtering map markers and risk table rows simultaneously
- [x] ZCQL query optimizations (handling aggregate counts, projected columns limits)

---

## 📁 REPOS STRUCTURE

```
datathon/
├── client/                     # Zoho Catalyst Slate static client target directory
│   ├── index.html              # Shell layout + UI panel markup
│   ├── main.css                # Gotham tokens, views grid, cluster overrides
│   ├── main.js                 # Unified state, maps, graph, chat controllers
│   └── fonts.css               # Font imports
├── data/                       # Ingestion & processed seeds
│   ├── processed/
│   │   └── bengaluru_crime_seed.json
│   └── triage_and_clean.py
├── functions/                  # Zoho Catalyst serverless backend functions
│   └── ashen_api/              # Node.js Advanced I/O Express server
│       ├── catalyst-config.json # Function metadata
│       ├── index.js            # Express app endpoints & ZCQL engines
│       ├── package.json        # Dependencies
│       └── test_query.js       # Temporary diagnostics query runner
├── district_risk_scores_seed.csv # Generated spatiotemporal seed
├── fir_records_seed.csv        # Generated incident log seed (75,000 rows)
├── offenders_seed.csv          # Generated offender profile seed
├── generate_firs.py            # Python Faker generation script
├── verify_data.py              # Data constraint verification script
├── catalyst.json               # Main Zoho project configuration mapping
├── .catalystrc                 # Zoho cloud project credential bindings
└── ASHEN_PROTOCOL.md           # Central Project Document (This file)
```

---

*Last updated: June 2026 | Solo submission by Tanmay | Team: Ashen Protocol*
