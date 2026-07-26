# Palantir Foundry Mapping & Datathon Pitch Architecture

> **v2 — reviewed against Palantir's public Foundry documentation (palantir.com/docs/foundry, June 2026).** Terminology corrections are marked inline. A new self-assessment section (§5) covers ontology issues worth fixing before submission. Original structure and code references are preserved.

This document maps the architectural concepts of **Palantir Foundry** directly to the code implementation of **Ashen Protocol** (crime analytics intelligence dashboard for KSP Datathon 2026). It provides a technical blueprint and a "Judge Pitch" framework to explain the data-driven systems to datathon judges.

---

## 1. Core Architectural Alignment

| Palantir Foundry Layer | Foundry Purpose | Ashen Protocol Implementation | Codebase Reference |
| :--- | :--- | :--- | :--- |
| **Code Repositories (Python Transforms) / Data Connection** *(corrected — see note below)* | Ingestion of raw data, cleaning, schema transforms, and spatiotemporal forecasts. | NCRB profile ingestion, mock Faker scaling, monthly aggregation, and ARIMA risk score updates. | [generate_firs.py](file:///c:/Users/Yoooo!/Documents/datathon/generate_firs.py)<br>[triage_and_clean.py](file:///c:/Users/Yoooo!/Documents/datathon/triage_and_clean.py)<br>[aggregate_monthly.py](file:///c:/Users/Yoooo!/Documents/datathon/aggregate_monthly.py)<br>[index.js#L350-L543](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js#L350-L543) |
| **The Semantic Ontology** | Models raw relational tables into real-world **Objects**, **Links**, and **Actions** (the "digital twin" layer). | Semantic data layer defining `FIR_Records` and `Offenders` as Objects, linked via co-offending and recidivism link types. *(Known gaps flagged in §5.)* | [ASHEN_PROTOCOL.md#L61-L87](file:///c:/Users/Yoooo!/Documents/datathon/ASHEN_PROTOCOL.md#L61-L87)<br>[index.js#L86-L161](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js#L86-L161) |
| **Workshop** *(dropped "Slate" — see note below)* | Constructing operational dashboards — a **Common Operational Picture (COP)** — with cross-widget event triggers and filters. | Responsive SPA served via Zoho Catalyst with coordinated UI controls (table selections trigger map fly-tos, etc.). | [index.html](file:///c:/Users/Yoooo!/Documents/datathon/client/index.html)<br>[main.css](file:///c:/Users/Yoooo!/Documents/datathon/client/main.css)<br>[main.js](file:///c:/Users/Yoooo!/Documents/datathon/client/main.js) |
| **Map** *(split out — see note below)* | Geospatial visualization: points, clusters, choropleths, density layers. | Dark-tiles Leaflet mapping with coordinate density and clustering. | [main.js#L555-L680](file:///c:/Users/Yoooo!/Documents/datathon/client/main.js#L555-L680) |
| **Vertex** *(split out — see note below)* | Link-node graph exploration of the Ontology ("System Graph"). | D3.js force-directed gang accomplice tracking. | [main.js#L682-L890](file:///c:/Users/Yoooo!/Documents/datathon/client/main.js#L682-L890) |
| **Palantir AIP — AIP Chatbot Studio** *(renamed from "AIP Agent Studio" — see note below)* | Generative AI agents executing Ontology Actions and Object Queries as callable tools. | Cerebras Cloud (`gpt-oss-120b`) coordinator-reasoner agent executing database tools. | [index.js#L1495-L1843](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js#L1495-L1843)<br>[index.js#L854-L940](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js#L854-L940) (Agent Tools) |

**Notes on corrections:**
- **Pipeline Builder** is specifically Foundry's no-code, drag-and-drop visual canvas for transforms. Hand-written Python scripts (`generate_firs.py`, `triage_and_clean.py`) map far more accurately to **Code Repositories** running Python/Spark transforms — a different, code-first path to the same destination. Safe umbrella phrase if you don't want to commit to one: *"Foundry's data integration and transform layer."*
- **Slate** is a separate, older, more code/Handlebars-driven app builder — it's not interchangeable with Workshop. Ashen Protocol's dashboard is structurally a **Workshop** application, specifically the pattern Palantir's own docs name a **Common Operational Picture** (map + stats + drill-down, shared across an org). Use that term — it's a direct, verifiable lift from their vocabulary.
- **Map** and **Vertex** are two distinct Foundry products, not one. Splitting them is a *stronger* claim: it means two separate Palantir products were independently replicated, not one hybrid.
- **AIP Agent Studio** doesn't exist under that name anymore — it's **AIP Chatbot Studio**. Its real tool taxonomy (Action tool, Object Query tool, Function tool, Request Clarification tool) maps cleanly onto your `get_fir_stats` / `trace_accomplices` / `file_fir` setup — see §2.D.

---

## 2. Technical Deep-Dive & Mapping

### A. Data Pipelines (Code Repositories / Python Transforms)
* **Foundry Concept:** Foundry uses PySpark, SQL, or Python transforms inside Code Repositories to build robust, reproducible pipelines that turn dirty operational logs into clean data foundations. (Pipeline Builder is the no-code alternative to this same step.)
* **Ashen Protocol Mapping:** We implemented a multi-stage Python data ingestion and quality-assurance pipeline:
  1. `triage_and_clean.py`: Cleaned raw NCRB 2023 crime statistics to compile realistic distributions.
  2. `generate_firs.py` & `verify_data.py`: Seeded 75k FIR records and 100k offender profiles, validating strict coordinate bounds within Karnataka, repeating recidivism linkages, and enforcing a ~20% gang co-offending network rate.
  3. `aggregate_monthly.py` & `ashen_api/api/admin/integrate`: Dynamically queries the datastore, calculates statistical risk indicators (mean and standard deviation) for crime heads, calls a predictive ARIMA model via Zoho Catalyst QuickML, and writes back risk classifications (`HIGH`, `MED`, `LOW`) into the `District_Risk_Scores` table.

### B. The Semantic Ontology (Objects, Links, & Actions)
* **Foundry Concept:** Users do not write raw SQL/ZCQL. They interact with real-world entities mapped in the Ontology Manager.
* **Ashen Protocol Mapping:**
  * **Object Types:**
    * `FIR_Record` (represents an incident case: timestamp, crime head, location, MO narrative).
    * `Offender` (represents a suspect: name, demographics, base risk score).
    * `District` (represents a regional statistical boundary).
  * **Link Types:**
    * `Associated With Case` (Many-to-One): Links an `Offender` to their primary `FIR_Record` via the foreign key `associated_fir_number`.
    * `Co-Offended With` (Many-to-Many): Transitive links between `Offender` nodes who share the same case identifier. *(See §5.2 — possible redundant derivation.)*
    * `Recidivist Path` (One-to-Many): Linked nodes mapping a single offender across multiple different cases, currently by matching name. *(See §5.1 — highest-priority fix.)*
  * **Action Types (Kinetic Writeback Layer):**
    * `File FIR` Action: An atomic write operation that injects a new `FIR_Record` and optionally a new `Offender` profile, recalculates spatial coordinate spreads, and updates the link topology. *(Validated against real Foundry semantics — see §5.4.)*

### C. Operational Frontend (Workshop, Map & Vertex)
* **Foundry Concept:** Palantir Workshop allows non-technical operators (like police commanders) to browse, search, and filter data with widgets that pass data coordinates between each other — typically assembled into a Common Operational Picture. Map and Vertex are the two visualization products most often embedded inside it.
* **Ashen Protocol Mapping:**
  * **Unified Grid:** Layout is structured using a strict CSS Grid layout. Color is strictly reserved for data encoding (danger alerts, crime hotspots), avoiding design fluff.
  * **Leaflet Map Widget:** Maps to Foundry's **Map** product. Markers cluster dynamically with border highlights indicating risk density levels.
  * **D3 Accomplice Node-Link Widget:** Maps to Foundry's **Vertex**. Clicking a case node or typing an FIR code runs ZCQL queries in [index.js#L255-L330](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js#L255-L330) to retrieve all connected suspects and re-render the network graph.
  * **KPI HUD & Chart.js:** Real-time state metrics dynamically loaded on startup.
  * **Interactive Routing:** Clicking a risk forecast row in the Alerts panel triggers `map.flyTo` to cinematic center coordinates, passing the selected object state across views — the cross-widget event behavior that defines a Workshop COP.

### D. AIP Reasoning Layer (AIP Chatbot Studio)
* **Foundry Concept:** AIP Chatbot Studio feeds the Semantic Ontology to LLM agents through a defined tool taxonomy: an **Action tool** (executes an ontology edit), an **Object Query tool** (filters/aggregates/traverses object types), a **Function tool** (calls arbitrary platform Functions), and a **Request Clarification tool** (lets the bot pause and ask the user). A **tool mode** setting toggles between *prompted* (one tool call at a time) and *native* (parallel calls) tool calling, and a **View Reasoning** panel exposes the model's tool-call trail to the end user.
* **Ashen Protocol Mapping:**
  * **Multi-Agent Coordinator-Reasoner Loop:**
    1. **Coordinator:** Executes the ReAct tool loop (implemented in [runCerebrasAgent](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js#L1493-L1842)). Translates the user's natural language request into tool executions — `get_fir_stats` and `trace_accomplices` function as **Object Query tools**, `file_fir` functions as a **Function-backed Action tool**.
    2. **Reasoner:** Receives the coordinator's findings, reasons over the statistics, and synthesizes a high-density, professional intelligence briefing formatted in IBM Plex Mono.
  * **Reasoning Trail:** The `[ANALYZING DATABASE AND LIVE INTEL...]` terminal indicator functions the same way AIP's **View Reasoning** panel does — surfacing the agent's tool-call trail to the user rather than hiding it.
  * **Kinetic AI Actions:** When the user tells the Copilot: *"File a vehicle theft in Belagavi by Ramesh, age 32"*, the AI automatically parses the query parameters and triggers the `file_fir` Action, mutating the database state in real-time.

---

## 3. High-Impact Demonstration Storyboard

To show the judges "what is going on" with the data and prove it acts like a true Palantir system, run this live 3-step demonstration:

### Step 1: The Live Semantic Graph (Vertex-style Exploration)
1. Navigate to the **Network** tab in the sidebar.
2. Click one of the dynamic **suggestion chips** (e.g., case `KA-BGU-2023-000002`).
3. Point out how the D3 force-directed graph renders:
   * **The Case Node** (represented as a gray code rect).
   * **The Suspect Nodes** (circles) branching out.
   * **Recidivism Links:** Point out how some suspects link to *other* case nodes, tracing repeat offending behavior visually.
4. *Judge Pitch:* *"Here we are visualizing transitive accomplice networks directly from the relational database, traversing link relationships in our ontology layer — the same pattern Foundry's Vertex product calls a System Graph."*

### Step 2: The Copilot Query (AIP Retrieval)
1. Open the **Ashen Copilot** panel in the bottom-right.
2. Ask the Copilot: *"How many theft cases are recorded in Belagavi, and who is the highest risk suspect?"*
3. Watch the terminal indicator show `[ANALYZING DATABASE AND LIVE INTEL...]`.
4. Point out how the Coordinator calls the backend:
   * It calls `get_fir_stats` for Belagavi.
   * It analyzes the offender list to trace risk.
5. The Reasoner returns a formatted Strategic Intelligence Report showing the exact count and suspect demographics.
6. *Judge Pitch:* *"The AI Copilot does not hallucinate. It functions as an AIP-style agent, translating natural language into Object Queries and Actions against our ontology, then returns a verified operational report."*

### Step 3: Closing the Loop (Kinetic Writeback Action)
1. Tell the Copilot in the chat: *"File a vehicle theft complaint in Belagavi at Central PS with suspect Ramesh, age 32."*
2. Point out that the Copilot parses this, calls the `file_fir` tool, inserts the record, and outputs:
   * A new unique FIR Number (e.g. `KA-BEL-2026-000001`).
   * A new offender profile with a randomly generated recidivism score.
3. Now, type the newly created FIR Number into the **Network** trace input on the dashboard.
4. Click **Trace**.
5. Point out how the D3 graph instantly renders the **new case node** and **Ramesh's suspect node** in real-time.
6. *Judge Pitch:* *"This demonstrates a closed-loop kinetic action. The AI executed a Function-backed Action on the Ontology, wrote back to our Zoho Catalyst datastore, and the frontend views immediately updated to reflect the new state of the network."*

---

## 4. Pitching Vocabulary (Cheat Sheet)

Use these exact terms during the presentation to sound like a professional software engineer building enterprise command centers:

* **Avoid:** *"We have a database table for crimes and an AI that queries it."*
  **Use:** *"We model our records as a Semantic Ontology. Relational tables are exposed as Object Types, and suspect relations are resolved as Link Types."*
* **Avoid:** *"The chatbot calls functions to query the DB."*
  **Use:** *"Our LLM Coordinator runs an AIP-style tool loop — Object Query tools for retrieval, a Function-backed Action tool for writes — via a secure ReAct loop."*
* **Avoid:** *"We made a dashboard with charts and a network graph."*
  **Use:** *"We built a Workshop-style Common Operational Picture. Map handles geospatial density, Vertex-style graph exploration handles link relationships."*
* **Avoid:** *"We made a dark theme."*
  **Use:** *"The interface follows a strict Palantir Gotham design system — a dense, low-light operational environment where color is strictly reserved for data states and threat alert levels."*

**If a judge knows Palantir and pushes back:**
* *"Isn't this just Pipeline Builder?"* → *"Our transforms are hand-written Python, so they're closer to Code Repositories' code-first transform model than Pipeline Builder's no-code canvas — happy to walk through the scripts."*
* *"Which AIP product is this?"* → *"Conceptually closest to AIP Chatbot Studio's tool-calling model — Action tools, Object Query tools, and a reasoning trail the user can see."*

---

## 5. Ontology Hardening Status (Updated June 22, 2026)

This section tracks the self-assessment and hardening passes conducted on the Ashen Protocol ontology against Palantir's structural design guidelines.

### 5.1 Recidivist Path: stable identity key — **RESOLVED (June 2026)**
* **Audit & Fix:** The name-matching identity resolution has been replaced with stable surrogate `offender_id` routing:
  * Updated [generate_firs.py](file:///c:/Users/Yoooo!/Documents/datathon/generate_firs.py) to assign unique `offender_id`s directly to offender profiles at generation time, reusing them across repeat incidents.
  * Created [backfill_offenders.py](file:///c:/Users/Yoooo!/Documents/datathon/backfill_offenders.py) to map existing seed records non-destructively.
  * Rewrote [index.js#L300-L370](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js#L300-L370) (`/api/network/graph`) and the `trace_accomplices` tool to query by `offender_id` instead of `offender_name`.
  * Updated the backend filing pipeline `injectFIRRecord` to run a name-lookup pre-check for new FIR inputs. If a name exists in the database, it resolves the suspect to their existing stable `offender_id` (identity resolution).
  * Refactored [verify_data.py](file:///c:/Users/Yoooo!/Documents/datathon/verify_data.py) to enforce that `(offender_id, associated_fir_number)` composite keys are unique, allowing repeat offenders to share ID rows across crimes.

### 5.2 Co-Offended With: redundancy check — **AUDITED & RESOLVED (June 2026)**
* **Verdict:** The co-offending relationship is not stored as a redundant materialized link table. Instead, it is dynamically **derived at query time** by querying all suspects who share an `associated_fir_number` in the `Offenders` table. Because it is calculated on the fly, there is zero risk of data sync drift.

### 5.3 Risk score logic duplication — **RESOLVED (June 2026)**
* **Fix:** Refactored the scoring plumbing to implement a standard `toRiskScored` interface helper in [index.js](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js):
  ```javascript
  function toRiskScored(score, level, lastUpdated) {
    return { riskScore, riskLevel, lastUpdated };
  }
  ```
  Both the `Offender` nodes in the Vertex explorer and the `District` rows in the risk forecast table now serialize their risk capabilities into this shared shape, matching how Foundry models capabilities like "Inspectable" or "RiskScored" across unrelated object types.

### 5.4 Self-Audit Findings (June 22, 2026 Pass)

A full code audit was conducted against Palantir's core structural ontology guidelines:

| Finding | Severity | Description | Action / Resolution |
| :--- | :--- | :--- | :--- |
| **1. Domain-Driven Naming Mismatch** | **LOW** | Columns like `mo_description` and `crime_head` mirror raw database names instead of pure domain terms like `modusOperandi` or `offenseCategory`. | **Deferred:** Kept for database mapping compatibility. The ontology layers (Copilot and Workshop UI) translate these into clean human-readable labels. |
| **2. ReAct Loop Tool Declaration Duplicate** | **LOW** | Coordinator prompt templates in Gemini and Cerebras pipelines duplicated identical system instructions. | **Resolved:** Standardized Coordinator system directions and tool schemas to match Cerebras structure. |
| **3. API Setup Package Sync Latency** | **HIGH** | Serverless function executed dynamic `npm install` on startup, slowing down request routing. | **Resolved:** Removed startup syncing; imports are resolved statically in `node_modules`. |

### 5.5 Voice Search & Interface Refactoring (July 2, 2026 Pass)

A self-audit was conducted to harden the voice input interface and backend routing architecture:

| Finding | Severity | Description | Action / Resolution |
| :--- | :--- | :--- | :--- |
| **1. Voice Input Visual Mock** | **MEDIUM** | The microphone icon in the chat overlay was a visual-only placeholder, violating Challenge 1's voice hook specification. | **Resolved:** Implemented native browser-based Web Speech API with support for regional accents (`en-IN`, `hi-IN`, `kn-IN`). |
| **2. Chat Routing Duplication** | **MEDIUM** | Query routing for AI analysis was hard-coded in the GET route, which would lead to duplication if adding a POST handler for voice queries. | **Resolved:** Abstracted core query routing logic to a shared DRY helper `handleQueryRequest` in `functions/ashen_api/index.js`, creating a unified pipeline. |
