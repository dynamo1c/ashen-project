# ASHEN PROTOCOL - ML & ONTOLOGY SESSION LOG

## Session Date: June 22, 2026

### 1. Objectives & Focus
* Hardening the semantic ontology model of Ashen Protocol to align with Palantir Foundry's published best practices and structural design guidelines.
* Resolving three specific known issues:
  1. Recidivist Path identity resolution.
  2. Co-Offended With redundancy audit.
  3. Shared risk-score interface mapping.
* Conducting a self-audit against Palantir's core design principles (domain-driven design, DRY, open-closed, composition).

---

### 2. Actions Taken & Technical Resolution

#### A. Stable Identity Resolution (1A)
* **Status:** **FIXED**
* **Change Details:**
  * Updated [generate_firs.py](file:///c:/Users/Yoooo!/Documents/datathon/generate_firs.py) to assign unique stable `offender_id`s directly to offender profiles on pool creation, ensuring repeat offenders reuse their IDs across cases.
  * Created [backfill_offenders.py](file:///c:/Users/Yoooo!/Documents/datathon/backfill_offenders.py) in the root workspace to deterministically map existing CSV records, preserving the incident dataset and QuickML risk scores non-destructively.
  * Rewrote `GET /api/network/graph` in [index.js](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js) and the agent's `trace_accomplices` tool to query by `offender_id` instead of `offender_name`.
  * Updated the backend filing pipeline `injectFIRRecord` to pre-check suspect names in the datastore, resolving repeat suspects to their existing `offender_id` (identity resolution).
  * Modified [verify_data.py](file:///c:/Users/Yoooo!/Documents/datathon/verify_data.py) to validate `(offender_id, associated_fir_number)` composite uniqueness rather than raw `offender_id` uniqueness, which matches the relational schema design.

#### B. Co-Offending Redundancy Audit (1B)
* **Status:** **AUDITED & FIXED**
* **Verdict:** The `Co-Offended With` link type is **derived at query time** by querying all suspect rows sharing a common `associated_fir_number`. No redundant link table is materialized in the database, meaning there is zero risk of data sync drift.

#### C. Shared RiskScored Interface (1C)
* **Status:** **FIXED**
* **Change Details:**
  * Created a shared helper `toRiskScored(score, level, lastUpdated)` in [index.js](file:///c:/Users/Yoooo!/Documents/datathon/functions/ashen_api/index.js).
  * Mapped both `Offender` graph nodes and `District` risk score rows to return the standard risk capability payload (`riskScore`, `riskLevel`, `lastUpdated`, and the `risk` sub-object) on load, removing duplicate plumbing while keeping the database fields and ARIMA models untouched.

---

### 3. Self-Audit Findings & Deferred Items

* **Domain-Driven Naming (CSV Legacy):**
  * **Finding:** Column names (`mo_description`, `crime_head`) mirror the original legacy structures rather than pure object properties (e.g. `modusOperandi`, `offenseClass`).
  * **Disposition:** **DEFERRED (Low Severity)**. Kept to maintain compatibility with Zoho Catalyst's Relational Data Store columns. The ontology layer (Copilot and UI views) translates them dynamically.
* **Open for Extension (No modification):**
  * **Finding:** Future analytical modules (like tracking modus operandi patterns) should be modeled as separate linked object types rather than bolting properties onto `FIR_Record`.
  * **Disposition:** **COMPLIANT**. The current 3-table layout separates incident logs, suspect links, and district-level risk score grids, allowing easy future linkages (e.g. a separate `Modus_Operandi_Patterns` object type).

---

### 4. Regression & Verification Check
* Checked that the D3 accomplice graph trace and the Copilot `file_fir` function-call loop routes are intact and function correctly using `offender_id` identities.

---

## Session Date: July 2, 2026

### 1. Objectives & Focus
* Implementing **Live Voice Search** for the Ashen Copilot web dashboard (Challenge 1: mic interface hooks for voice input).
* Introducing browser-native, multi-lingual voice recognition utilizing the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
* Standardizing backend routing by introducing `POST /api/copilot/query` and refactoring Express chat query handlers to follow DRY principles.

---

### 2. Actions Taken & Technical Resolution

#### A. Multi-Lingual Speech Recognition Module
* **Status:** **FIXED & VERIFIED**
* **Change Details:**
  * Created `client/voiceSearch.js` defining `AshenVoiceSearch`, configuring it for non-continuous, interim results, and mapping local Indian accent setups.
  * Added voice select UI buttons (`EN`, `HI`, `KN`) and active border recording animations matching Gotham's design parameters to `index.html` and `main.css`.
  * Mapped interim speech transcription live into `#chat-input` and wired automated form submission upon final pause detection.
  * Surfaced microphone permissions and speech capture errors to the user via a terminal status indicator `#voice-status`.

#### B. API Unified Routing
* **Status:** **FIXED**
* **Change Details:**
  * Created a shared handler `handleQueryRequest(req, res, queryText, source)` in `functions/ashen_api/index.js` to ensure the exact same AI tool loop and rule-based queries are run for voice and text searches alike.
  * Exposed a new endpoint `POST /api/copilot/query` that accepts voice inputs with body `{ query, source }` for backend routing.
