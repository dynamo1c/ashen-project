const express = require('express');
// Trigger function reload to pick up new CEREBRAS_API_KEY from .env
const catalyst = require('zcatalyst-sdk-node');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Manually Load Environment Variables from .env file
function loadEnv() {
  const searchDirs = [__dirname, process.cwd()];
  for (const startDir of searchDirs) {
    let curr = startDir;
    for (let i = 0; i < 6; i++) {
      const envPath = path.join(curr, '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const firstEqual = trimmed.indexOf('=');
            if (firstEqual !== -1) {
              const key = trimmed.substring(0, firstEqual).trim();
              const val = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
              process.env[key] = val;
            }
          }
        });
        console.log(`[+] Environment variables loaded from: ${envPath}`);
        return;
      }
      const parent = path.dirname(curr);
      if (parent === curr) break;
      curr = parent;
    }
  }
}
loadEnv();

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'cerebras';

if (LLM_PROVIDER === 'cerebras') {
  if (!process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY.trim() === '' || process.env.CEREBRAS_API_KEY === 'your_cerebras_key_here') {
    throw new Error("Startup Error: CEREBRAS_API_KEY is missing or set to placeholder in environment variables (.env) while LLM_PROVIDER is set to 'cerebras'.");
  }
}

const COORDINATOR_MODEL = 'gemini-2.5-flash';
const REASONER_MODEL = 'gemini-2.5-pro';

const app = express();
app.use(cors());
app.use(express.json());

// Support Catalyst router prefix (/server/ashen_api/api/*) in standalone & emulation mode
app.use((req, res, next) => {
  if (req.url.startsWith('/server/ashen_api')) {
    req.url = req.url.replace(/^\/server\/ashen_api/, '');
    if (!req.url.startsWith('/')) req.url = '/' + req.url;
  }
  next();
});


// Robust clientDir path resolution across development, Catalyst emulation & build directories
const possibleClientDirs = [
  path.resolve(process.cwd(), 'client'),
  path.resolve(__dirname, '..', '..', 'client'),
  path.resolve(__dirname, '..', 'client'),
  path.resolve(__dirname, 'client')
];
const clientDir = possibleClientDirs.find(dir => fs.existsSync(path.join(dir, 'index.html'))) || possibleClientDirs[0];

if (fs.existsSync(clientDir)) {
  app.use('/app', express.static(clientDir));
  app.use(express.static(clientDir));
  
  app.get(['/', '/app', '/app/*'], (req, res) => {
    const indexPath = path.join(clientDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    res.status(200).send('<html><body><h1>Ashen Protocol</h1><p>Client index.html loading...</p></body></html>');
  });
}








/**
 * Normalizes Catalyst Datastore's table-nested result structure into clean, flat JSON objects.
 * (e.g. transforms [{ FIR_Records: { latitude: 12.3 } }] into [{ latitude: 12.3 }])
 *
 * @param {Array<Object>} rows - Array of nested row outputs from executeQL
 * @returns {Array<Object>} Flat JSON array
 */
function flattenResults(result) {
  let rows = result;
  if (result && typeof result === 'object' && Array.isArray(result.content)) {
    rows = result.content;
  }
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(row => {
    const flat = {};
    for (const key in row) {
      if (row.hasOwnProperty(key)) {
        if (typeof row[key] === 'object' && row[key] !== null) {
          Object.assign(flat, row[key]);
        } else {
          flat[key] = row[key];
        }
      }
    }
    return flat;
  });
}

/**
 * Inserts a new FIR record (and optional suspect record) into Zoho Catalyst Data Store
 *
 * @param {Object} catalystApp - Initialized Catalyst SDK app instance
 * @param {Object} data - Form data or parsed chat values
 * @returns {Promise<Object>} Inserted rows info
 */
/**
 * Shared utility representing the RiskScored interface across Ontology Object Types.
 */
function toRiskScored(score, level = null, lastUpdated = null) {
  let classifiedLevel = level;
  if (!classifiedLevel) {
    const s = parseFloat(score) || 0.0;
    if (s >= 70.0) classifiedLevel = 'HIGH';
    else if (s >= 35.0) classifiedLevel = 'MED';
    else classifiedLevel = 'LOW';
  }
  return {
    riskScore: parseFloat(score) || 0.0,
    riskLevel: classifiedLevel.toUpperCase(),
    lastUpdated: lastUpdated || new Date().toISOString()
  };
}

/**
 * Inserts a new FIR record (and optional suspect record) into Zoho Catalyst Data Store
 *
 * @param {Object} catalystApp - Initialized Catalyst SDK app instance
 * @param {Object} data - Form data or parsed chat values
 * @returns {Promise<Object>} Inserted rows info
 */
async function injectFIRRecord(catalystApp, data) {
  const districtCenters = {
    'Bengaluru Urban': { lat: 12.9716, lon: 77.5946 },
    'Mysuru': { lat: 12.2958, lon: 76.6394 },
    'Hubballi-Dharwad': { lat: 15.3647, lon: 75.1240 },
    'Mangaluru': { lat: 12.9141, lon: 74.8560 },
    'Belagavi': { lat: 15.8497, lon: 74.4977 }
  };
  const districtCodes = {
    'Bengaluru Urban': 'BGU',
    'Mysuru': 'MYS',
    'Hubballi-Dharwad': 'HBD',
    'Mangaluru': 'MNG',
    'Belagavi': 'BEL'
  };

  const district = data.district || 'Bengaluru Urban';
  if (!districtCenters[district]) {
    throw new Error(`Invalid district: ${district}. Bounded to: ${Object.keys(districtCenters).join(', ')}`);
  }

  // 1. Generate unique FIR number
  const code = districtCodes[district];
  const year = new Date().getFullYear();
  let indexPart = '';
  try {
    const countQuery = `SELECT COUNT(fir_number) FROM FIR_Records WHERE district = '${district.replace(/'/g, "''")}'`;
    const countRes = await catalystApp.zcql().executeZCQLQuery(countQuery);
    const count = parseInt(flattenResults(countRes)[0]['COUNT(fir_number)']) || 0;
    indexPart = String(count + 1).padStart(6, '0');
  } catch (e) {
    indexPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  }
  const fir_number = `KA-${code}-${year}-${indexPart}`;

  // 2. Generate coordinates slightly spread around center
  const center = districtCenters[district];
  const latitude = parseFloat((center.lat + (Math.random() - 0.5) * 0.08).toFixed(4));
  const longitude = parseFloat((center.lon + (Math.random() - 0.5) * 0.08).toFixed(4));

  // 3. Format timestamp YYYY-MM-DD HH:mm:ss
  const d = new Date();
  const timestamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  // 4. Insert FIR row
  const firRow = {
    fir_number,
    incident_timestamp: timestamp,
    district,
    police_station: data.police_station || 'Central PS',
    crime_head: data.crime_head || 'Theft',
    mo_description: data.mo_description || 'Live complaint filed via intelligence portal.',
    latitude,
    longitude
  };
  await catalystApp.datastore().table('FIR_Records').insertRow(firRow);

  // 5. Optionally Insert Suspect with stable Identity Resolution
  let suspectInfo = null;
  if (data.offender_name && data.offender_name.trim().length > 0) {
    const oName = data.offender_name.trim();
    const escapedName = oName.replace(/'/g, "''");
    let offender_id;
    let base_risk_score;

    try {
      const existQuery = `SELECT offender_id, base_risk_score FROM Offenders WHERE offender_name = '${escapedName}' LIMIT 1`;
      const existRes = await catalystApp.zcql().executeZCQLQuery(existQuery);
      const flatExist = flattenResults(existRes);
      if (flatExist.length > 0) {
        offender_id = flatExist[0].offender_id;
        base_risk_score = parseFloat(flatExist[0].base_risk_score) || parseFloat((Math.random() * 85 + 10).toFixed(2));
        console.log(`[Identity Resolution] Found existing offender_id ${offender_id} for suspect "${oName}"`);
      } else {
        offender_id = `OFF-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
        base_risk_score = parseFloat((Math.random() * 85 + 10).toFixed(2));
      }
    } catch (err) {
      offender_id = `OFF-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
      base_risk_score = parseFloat((Math.random() * 85 + 10).toFixed(2));
    }

    const suspectRow = {
      offender_id,
      associated_fir_number: fir_number,
      offender_name: oName,
      age: parseInt(data.age, 10) || 30,
      gender: data.gender || 'MALE',
      base_risk_score
    };
    await catalystApp.datastore().table('Offenders').insertRow(suspectRow);
    suspectInfo = suspectRow;
  }

  return { firRow, suspectInfo };
}


// Root endpoint to verify server status
app.get('/', (req, res) => {
  res.status(200).json({ status: "running", service: "Ashen Protocol Catalyst API Layer" });
});

// 1. GET /api/analytics/summary
// 1. GET /api/analytics/summary
app.get('/api/analytics/summary', async (req, res) => {
  try {
    let totalFirs = 1240;
    let totalOffenders = 485;
    let groupedCrimes = {
      'Theft & Property': 420,
      'Cybercrime': 310,
      'Narcotics & Excise': 185,
      'Violent Crimes': 140,
      'Financial Crimes': 115,
      'Other Violations': 70
    };

    try {
      const catalystApp = catalyst.initialize(req, { scope: 'admin' });
      const firCountResult = await catalystApp.zcql().executeZCQLQuery("SELECT COUNT(fir_number) FROM FIR_Records");
      totalFirs = parseInt(flattenResults(firCountResult)[0]['COUNT(fir_number)']) || totalFirs;

      const offenderCountResult = await catalystApp.zcql().executeZCQLQuery("SELECT COUNT(offender_id) FROM Offenders");
      totalOffenders = parseInt(flattenResults(offenderCountResult)[0]['COUNT(offender_id)']) || totalOffenders;

      const categoryResult = await catalystApp.zcql().executeZCQLQuery("SELECT crime_head, COUNT(fir_number) FROM FIR_Records GROUP BY crime_head");
      const flatCategories = flattenResults(categoryResult);

      if (flatCategories.length > 0) {
        groupedCrimes = { 'Theft & Property': 0, 'Cybercrime': 0, 'Narcotics & Excise': 0, 'Violent Crimes': 0, 'Financial Crimes': 0, 'Other Violations': 0 };
        flatCategories.forEach(row => {
          const head = row.crime_head || 'Other';
          const count = parseInt(row['COUNT(fir_number)']) || 0;
          const ch = head.toLowerCase();
          if (/theft|robbery|dacoity|extortion|burglary|stolen|house-breaking|possession|take away/.test(ch)) groupedCrimes['Theft & Property'] += count;
          else if (/it act|information technology|cyber|internet|online|computer|unauthorized|phishing|intellectual property|copy right|trade mark/.test(ch)) groupedCrimes['Cybercrime'] += count;
          else if (/ndps|drug|narcotic|consumption|trafficking|excise|liquor|alcohol|excise act|prohibition act/.test(ch)) groupedCrimes['Narcotics & Excise'] += count;
          else if (/murder|homicide|suicide|death|negligence|hurt|assault|outrage|acid attack|rape|pocso|child|kidnapping|abduction|rioting|riots|enmity|rivalry|injury/.test(ch)) groupedCrimes['Violent Crimes'] += count;
          else if (/cheating|forgery|fraud|counterfeit|stamp|benami|bribery|corruption|negotiable instruments|chit fund|lotteries/.test(ch)) groupedCrimes['Financial Crimes'] += count;
          else groupedCrimes['Other Violations'] += count;
        });
      }
    } catch (e) {
      console.log("[Notice] Using fallback summary metrics.");
    }

    res.status(200).json({
      total_firs: totalFirs,
      total_offenders_tracked: totalOffenders,
      crime_category_breakdown: groupedCrimes
    });
  } catch (error) {
    console.error("[-] Error in GET /api/analytics/summary:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 2. GET /api/map/hotspots
app.get('/api/map/hotspots', async (req, res) => {
  try {
    let flatHotspots = [];
    try {
      const catalystApp = catalyst.initialize(req, { scope: 'admin' });
      const district = req.query.district || 'all';
      let query = district !== 'all' 
        ? `SELECT fir_number, district, police_station, latitude, longitude, crime_head, incident_timestamp FROM FIR_Records WHERE district = '${district.replace(/'/g, "''")}' LIMIT 300`
        : `SELECT fir_number, district, police_station, latitude, longitude, crime_head, incident_timestamp FROM FIR_Records LIMIT 300`;
      const result = await catalystApp.zcql().executeZCQLQuery(query);
      flatHotspots = flattenResults(result);
    } catch (e) {
      console.log("[Notice] Using fallback hotspots data.");
    }

    if (flatHotspots.length === 0) {
      const districts = [
        { name: 'Bengaluru Urban', lat: 12.9716, lon: 77.5946, station: 'Central PS' },
        { name: 'Belagavi', lat: 15.8497, lon: 74.4977, station: 'Belagavi Town PS' },
        { name: 'Hubballi-Dharwad', lat: 15.3647, lon: 75.1240, station: 'Hubballi Sub-Urban PS' },
        { name: 'Mangaluru', lat: 12.9141, lon: 74.8560, station: 'Mangaluru North PS' },
        { name: 'Mysuru', lat: 12.2958, lon: 76.6394, station: 'Lashkar PS' }
      ];
      const crimes = ['Property Theft', 'Cybercrime', 'Narcotics', 'Violent Homicide', 'Financial Fraud'];

      districts.forEach((d, idx) => {
        for (let i = 0; i < 6; i++) {
          flatHotspots.push({
            fir_number: `KA-${d.name.slice(0,3).toUpperCase()}-2026-000${idx*6 + i + 1}`,
            district: d.name,
            police_station: d.station,
            latitude: parseFloat((d.lat + (Math.random() - 0.5) * 0.04).toFixed(4)),
            longitude: parseFloat((d.lon + (Math.random() - 0.5) * 0.04).toFixed(4)),
            crime_head: crimes[i % crimes.length],
            incident_timestamp: '2026-07-25 14:30:00'
          });
        }
      });
    }

    res.status(200).json(flatHotspots);
  } catch (error) {
    console.error("[-] Error in GET /api/map/hotspots:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


// 3. GET /api/network/graph — Multi-Hop Association Engine (1st, 2nd, 3rd Degree Links)
app.get('/api/network/graph', async (req, res) => {
  try {
    const fir_number = req.query.fir_number || 'KA-BGU-2023-000002';
    const maxHopDepth = Math.min(Math.max(parseInt(req.query.hop_depth, 10) || 1, 1), 3);
    const nodesMap = new Map();
    const links = [];
    const linkSet = new Set();

    const addLink = (source, target, type, value = 1, extra = {}) => {
      const linkKey = `${source}->${target}`;
      const revKey = `${target}->${source}`;
      if (!linkSet.has(linkKey) && !linkSet.has(revKey)) {
        linkSet.add(linkKey);
        links.push({ source, target, type, value, ...extra });
      }
    };

    let datastoreSuccess = false;

    try {
      const catalystApp = catalyst.initialize(req, { scope: 'admin' });
      const escapedFir = fir_number.replace(/'/g, "''");
      const primaryQuery = `SELECT offender_id, offender_name, age, gender, base_risk_score, associated_fir_number FROM Offenders WHERE associated_fir_number = '${escapedFir}'`;
      const primaryResult = await catalystApp.zcql().executeZCQLQuery(primaryQuery);
      const flatPrimary = flattenResults(primaryResult);

      if (flatPrimary.length > 0) {
        datastoreSuccess = true;
        nodesMap.set(fir_number, { id: fir_number, label: fir_number, type: 'fir', degree: 1 });
        flatPrimary.forEach(row => {
          const sId = row.offender_id;
          if (!sId) return;
          const riskInfo = toRiskScored(row.base_risk_score);
          nodesMap.set(sId, {
            id: sId,
            label: row.offender_name,
            type: 'suspect',
            degree: 1,
            age: parseInt(row.age) || 0,
            gender: row.gender,
            base_risk_score: riskInfo.riskScore,
            risk: riskInfo,
            parent_fir: fir_number
          });
          addLink(sId, fir_number, 'co_offending', 1.5);
        });
      }
    } catch (e) {
      console.log("[Notice] Using fallback network graph generator.");
    }

    if (!datastoreSuccess || nodesMap.size === 0) {
      nodesMap.set(fir_number, { id: fir_number, label: fir_number, type: 'fir', degree: 1 });
      nodesMap.set('OFF-001042', { id: 'OFF-001042', label: 'Imran Khan', type: 'suspect', degree: 1, age: 34, gender: 'MALE', base_risk_score: 85.0 });
      nodesMap.set('OFF-001089', { id: 'OFF-001089', label: 'Pradeep Naik', type: 'suspect', degree: 1, age: 28, gender: 'MALE', base_risk_score: 92.0 });
      nodesMap.set('LOC-KORAMANGALA', { id: 'LOC-KORAMANGALA', label: 'Koramangala PS Zone', type: 'location', degree: 1 });

      addLink('OFF-001042', fir_number, 'co_offending', 1.5);
      addLink('OFF-001089', fir_number, 'co_offending', 1.5);
      addLink('LOC-KORAMANGALA', fir_number, 'location_proximity', 1);

      if (maxHopDepth >= 2) {
        const secFir = 'KA-BGU-2023-080802';
        nodesMap.set(secFir, { id: secFir, label: secFir, type: 'fir', degree: 2 });
        nodesMap.set('OFF-002155', { id: 'OFF-002155', label: 'Sunil Gowda', type: 'suspect', degree: 2, age: 39, gender: 'MALE', base_risk_score: 74.0 });
        
        addLink('OFF-001042', secFir, 'co_offending', 1);
        addLink('OFF-002155', secFir, 'co_offending', 1);
        addLink('OFF-001042', 'OFF-002155', 'shared_mo', 1, { dashed: true, mo_match_score: 91, mo_description: 'Cross-District MO Match (91% Similarity)' });
      }

      if (maxHopDepth >= 3) {
        const kingpinId = 'OFF-KINGPIN-01';
        nodesMap.set(kingpinId, { id: kingpinId, label: 'Ramesh Kumar', type: 'suspect', degree: 3, age: 46, gender: 'MALE', base_risk_score: 98.0 });
        const cellId = 'CELL-SYNDICATE-BGU';
        nodesMap.set(cellId, { id: cellId, label: '👑 Organized Syndicate Cell', type: 'syndicate_cell', degree: 3 });

        addLink(kingpinId, cellId, 'syndicate_hierarchy', 2, { dashed: true });
        addLink('OFF-001042', cellId, 'syndicate_link', 1, { dashed: true });
      }
    }

    const nodes = Array.from(nodesMap.values());
    res.status(200).json({ nodes, links, hop_depth: maxHopDepth, total_nodes: nodes.length });
  } catch (error) {
    console.error("[-] Error in GET /api/network/graph:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 4. GET /api/predict/risk
app.get('/api/predict/risk', async (req, res) => {
  try {
    let mapped = [];
    try {
      const catalystApp = catalyst.initialize(req, { scope: 'admin' });
      const riskQuery = "SELECT district, statistical_month, statistical_year, base_incident_count, predicted_risk_level FROM District_Risk_Scores ORDER BY statistical_year DESC, statistical_month DESC LIMIT 5";
      const result = await catalystApp.zcql().executeZCQLQuery(riskQuery);
      const flatRisk = flattenResults(result);

      mapped = flatRisk.map(row => {
        const lastUpdated = `${row.statistical_year}-${String(row.statistical_month).padStart(2, '0')}-01T00:00:00Z`;
        const riskInfo = toRiskScored(
          row.base_incident_count ? (row.base_incident_count / 10.0) : 0.0,
          row.predicted_risk_level,
          lastUpdated
        );
        return {
          district: row.district,
          statistical_month: parseInt(row.statistical_month, 10),
          statistical_year: parseInt(row.statistical_year, 10),
          base_incident_count: parseInt(row.base_incident_count, 10),
          predicted_risk_level: riskInfo.riskLevel,
          risk_score: riskInfo.riskScore,
          risk: riskInfo
        };
      });
    } catch (e) {
      console.log("[Notice] Using fallback district risk forecast.");
    }

    if (mapped.length === 0) {
      const sampleDistricts = [
        { district: 'Bengaluru Urban', count: 48, level: 'HIGH' },
        { district: 'Belagavi', count: 32, level: 'HIGH' },
        { district: 'Hubballi-Dharwad', count: 24, level: 'MEDIUM' },
        { district: 'Mangaluru', count: 36, level: 'HIGH' },
        { district: 'Mysuru', count: 18, level: 'MEDIUM' }
      ];
      mapped = sampleDistricts.map(d => {
        const riskInfo = toRiskScored(d.count / 5.0, d.level);
        return {
          district: d.district,
          statistical_month: 7,
          statistical_year: 2026,
          base_incident_count: d.count,
          predicted_risk_level: riskInfo.riskLevel,
          risk_score: riskInfo.riskScore,
          risk: riskInfo
        };
      });
    }

    res.status(200).json(mapped);
  } catch (error) {
    console.error("[-] Error in GET /api/predict/risk:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


// GET /api/analytics/anomalies
let detectCrimeAnomalies;
try {
  detectCrimeAnomalies = require('./anomaly_engine').detectCrimeAnomalies;
} catch (e) {
  detectCrimeAnomalies = () => [
    { district: 'Belagavi', police_station: 'Belagavi Town PS', crime_head: 'Property Theft', anomaly_type: 'UNDERREPORTING_DROP', severity: 'HIGH', percentage_change: -60.0, z_score: -2.45, baseline_monthly_avg: 210, current_month_val: 84, insight_summary: 'Unexpected 60% drop in reported property thefts in Belagavi — Possible Underreporting Anomaly', action_recommendation: 'Deploy Supervisory Audit Team & Audit Unregistered Station Complaint Registers' },
    { district: 'Bengaluru Urban', police_station: 'Cyber Crime PS', crime_head: 'Cybercrime', anomaly_type: 'ABNORMAL_SPIKE', severity: 'CRITICAL', percentage_change: 77.88, z_score: 2.85, baseline_monthly_avg: 520, current_month_val: 925, insight_summary: 'Sudden +77.88% surge in reported cybercrimes in Bengaluru Urban — Possible Syndicate Outbreak', action_recommendation: 'Dispatch Cyber Cell Rapid Response & Issue Bank Account Freeze Advisory' },
    { district: 'Hubballi-Dharwad', police_station: 'Hubballi Sub-Urban PS', crime_head: 'Narcotics', anomaly_type: 'UNDERREPORTING_DROP', severity: 'HIGH', percentage_change: -58.26, z_score: -2.15, baseline_monthly_avg: 115, current_month_val: 48, insight_summary: 'Unexpected 58.26% drop in reported narcotics in Hubballi-Dharwad — Possible Underreporting Anomaly', action_recommendation: 'Inspect Station NDPS Seizure Register & Verify Patrol Logging' },
    { district: 'Mangaluru', police_station: 'Mangaluru North PS', crime_head: 'Violent Homicide', anomaly_type: 'ABNORMAL_SPIKE', severity: 'CRITICAL', percentage_change: 77.14, z_score: 2.30, baseline_monthly_avg: 35, current_month_val: 62, insight_summary: 'Sudden +77.14% surge in reported violent homicides in Mangaluru — Possible Syndicate Outbreak', action_recommendation: 'Establish District Checkpoints & Activate Anti-Gang Strike Unit' },
    { district: 'Mysuru', police_station: 'Lashkar PS', crime_head: 'Financial Fraud', anomaly_type: 'UNDERREPORTING_DROP', severity: 'MEDIUM', percentage_change: -58.33, z_score: -2.20, baseline_monthly_avg: 180, current_month_val: 75, insight_summary: 'Unexpected 58.33% drop in reported financial frauds in Mysuru — Possible Underreporting Anomaly', action_recommendation: 'Cross-reference Bank Complaint Escrow Logs with Station FIR Filings' }
  ];
}

app.get('/api/analytics/anomalies', async (req, res) => {
  try {
    const anomalies = detectCrimeAnomalies([]);
    res.status(200).json({
      status: 'success',
      total_anomalies: anomalies.length,
      anomalies
    });
  } catch (error) {
    console.error("[-] Error in GET /api/analytics/anomalies:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// GET /api/analytics/recidivism
app.get('/api/analytics/recidivism', async (req, res) => {
  try {
    let offenderProfiles = [];
    
    try {
      const catalystApp = catalyst.initialize(req, { scope: 'admin' });
      const query = `SELECT offender_id, offender_name, age, gender, base_risk_score, associated_fir_number FROM Offenders LIMIT 2000`;
      const resZcql = await catalystApp.zcql().executeZCQLQuery(query);
      const rows = flattenResults(resZcql);
      if (rows && rows.length > 0) {
        offenderProfiles = rows.map((r, i) => ({
          offender_id: r.offender_id || `OFF-${1000 + i}`,
          offender_name: r.offender_name || `Suspect Profile ${i+1}`,
          age: parseInt(r.age, 10) || (20 + (i * 3) % 45),
          gender: r.gender || (i % 5 === 0 ? 'FEMALE' : 'MALE'),
          prior_offenses: Math.floor((parseFloat(r.base_risk_score) || 40) / 10),
          risk_score: parseFloat(r.base_risk_score) || 45.0,
          crime_head: (i % 4 === 0) ? 'Cybercrime' : (i % 3 === 0) ? 'Narcotics' : (i % 2 === 0) ? 'Theft & Robbery' : 'Violent Crime',
          district: (i % 5 === 0) ? 'Bengaluru Urban' : (i % 4 === 0) ? 'Belagavi' : (i % 3 === 0) ? 'Mysuru' : (i % 2 === 0) ? 'Mangaluru' : 'Hubballi-Dharwad',
          recidivism_risk_level: (parseFloat(r.base_risk_score) > 70) ? 'CRITICAL' : (parseFloat(r.base_risk_score) > 40) ? 'HIGH' : 'MEDIUM'
        }));
      }
    } catch (e) {
      console.log("[Notice] Using realistic statistical Recidivism dataset generator.");
    }

    if (offenderProfiles.length < 1480) {
      const crimeTypes = ['Theft & Robbery', 'Cybercrime', 'Narcotics', 'Violent Crime', 'Financial Fraud'];
      const districts = [
        'Bengaluru Urban', 'Belagavi', 'Hubballi-Dharwad', 'Mangaluru', 'Mysuru', 
        'Kalaburagi', 'Ballari', 'Davanagere', 'Shivamogga', 'Tumakuru', 'Udupi', 'Hassan'
      ];
      const maleFirst = ['Ramesh', 'Sunil', 'Vijay', 'Karan', 'Imran', 'Anand', 'Santhosh', 'Pradeep', 'Mohammed', 'Deepak', 'Rajesh', 'Praveen', 'Suresh', 'Manjunath', 'Chetan', 'Ganesh'];
      const maleLast = ['Kumar', 'Gowda', 'Shetty', 'Patil', 'Khan', 'Kulkarni', 'R', 'Naik', 'Ali', 'V', 'Hegde', 'Poojary', 'Nayak', 'Rao', 'Babu', 'Bhat'];
      const femaleNames = ['Pooja Rao', 'Kavitha S', 'Deepa Hegde', 'Meena Kumari', 'Reshma Banu', 'Shilpa N', 'Anitha M', 'Suma K', 'Radhika Bhat', 'Lakshmi Narayanan'];

      const startIdx = offenderProfiles.length;
      const countToGenerate = 1480 - startIdx;
      const existingIds = new Set(offenderProfiles.map(p => p.offender_id));

      for (let i = 0; i < countToGenerate; i++) {
        const uniqueIdx = startIdx + i;
        const isFemale = uniqueIdx % 8 === 0;
        const mFirst = maleFirst[uniqueIdx % maleFirst.length];
        const mLast = maleLast[(uniqueIdx * 3) % maleLast.length];
        const name = isFemale ? femaleNames[uniqueIdx % femaleNames.length] + ` ${Math.floor(uniqueIdx/8)+1}` : `${mFirst} ${mLast} ${uniqueIdx+1}`;
        const age = Math.floor(18 + Math.random() * 48);
        
        let basePriors = Math.floor(Math.random() * 3);
        if (!isFemale && age >= 18 && age <= 25) basePriors += Math.floor(Math.random() * 6 + 2);
        if (age > 45) basePriors = Math.max(0, basePriors - 2);

        const riskScore = Math.min(99.2, Math.max(10.5, parseFloat((basePriors * 11.2 + (age <= 25 ? 28 : 12) + Math.random() * 14).toFixed(1))));
        const riskLevel = riskScore >= 75 ? 'CRITICAL' : riskScore >= 45 ? 'HIGH' : 'MEDIUM';

        let offender_id = `OFF-${String(84000 + uniqueIdx).padStart(6, '0')}`;
        while (existingIds.has(offender_id)) {
          offender_id = `OFF-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
        }
        existingIds.add(offender_id);

        offenderProfiles.push({
          offender_id,
          offender_name: name,
          age,
          gender: isFemale ? 'FEMALE' : 'MALE',
          prior_offenses: basePriors,
          risk_score: riskScore,
          crime_head: crimeTypes[uniqueIdx % crimeTypes.length],
          district: districts[uniqueIdx % districts.length],
          recidivism_risk_level: riskLevel
        });
      }
    }


    const youthCohort = offenderProfiles.filter(p => p.gender === 'MALE' && p.age >= 18 && p.age <= 25);
    const adultCohort = offenderProfiles.filter(p => p.gender === 'MALE' && p.age >= 26 && p.age <= 35);
    const femaleCohort = offenderProfiles.filter(p => p.gender === 'FEMALE');
    const seniorCohort = offenderProfiles.filter(p => p.age >= 45);

    const calcRate = (arr) => arr.length ? Math.round((arr.filter(p => p.prior_offenses >= 2).length / arr.length) * 100) : 0;
    const calcAvgPriors = (arr) => arr.length ? (arr.reduce((s, p) => s + p.prior_offenses, 0) / arr.length).toFixed(1) : 0;

    res.status(200).json({
      status: 'success',
      total_profiles: offenderProfiles.length,
      cohort_summary: {
        youth_male_rate: `${calcRate(youthCohort)}%`,
        youth_male_avg_priors: calcAvgPriors(youthCohort),
        adult_male_rate: `${calcRate(adultCohort)}%`,
        adult_male_avg_priors: calcAvgPriors(adultCohort),
        female_rate: `${calcRate(femaleCohort)}%`,
        female_avg_priors: calcAvgPriors(femaleCohort),
        senior_rate: `${calcRate(seniorCohort)}%`,
        senior_avg_priors: calcAvgPriors(seniorCohort)
      },
      profiles: offenderProfiles
    });
  } catch (error) {
    console.error("[-] Error in GET /api/analytics/recidivism:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


// ==========================================================================
// TF-IDF VECTOR SIMILARITY ENGINE FOR MO NARRATIVES
// ==========================================================================
const ENGLISH_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !ENGLISH_STOP_WORDS.has(w));
}

function computeTF(tokens) {
  const tf = {};
  tokens.forEach(t => {
    tf[t] = (tf[t] || 0) + 1;
  });
  const total = tokens.length;
  for (const t in tf) {
    tf[t] = tf[t] / total;
  }
  return tf;
}

function computeCosineSimilarity(tf1, tf2, idf) {
  const terms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  terms.forEach(t => {
    const val1 = (tf1[t] || 0) * (idf[t] || 1.0);
    const val2 = (tf2[t] || 0) * (idf[t] || 1.0);
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  });

  if (norm1 === 0 || norm2 === 0) return 0;
  return parseFloat((dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))).toFixed(4));
}

// GET /api/analytics/mo-matches
app.get('/api/analytics/mo-matches', async (req, res) => {
  try {
    const targetId = req.query.fir_number;
    if (!targetId) {
      return res.status(400).json({ error: "Missing required parameter 'fir_number'" });
    }

    let targetCase = null;
    let pool = [];

    // Step 1: Attempt to load from Catalyst Datastore
    try {
      const catalystApp = catalyst.initialize(req, { scope: 'admin' });
      const escapedId = targetId.replace(/'/g, "''");
      const targetRes = await catalystApp.zcql().executeZCQLQuery(`SELECT fir_number, district, police_station, crime_head, mo_description, incident_timestamp FROM FIR_Records WHERE fir_number = '${escapedId}' LIMIT 1`);
      const targetRows = flattenResults(targetRes);
      if (targetRows.length > 0) {
        targetCase = targetRows[0];
        
        // Fetch matching category pool
        const categoryEscaped = targetCase.crime_head.replace(/'/g, "''");
        const poolRes = await catalystApp.zcql().executeZCQLQuery(`SELECT fir_number, district, police_station, crime_head, mo_description, incident_timestamp FROM FIR_Records WHERE crime_head = '${categoryEscaped}' AND fir_number != '${escapedId}' LIMIT 100`);
        pool = flattenResults(poolRes);
      }
    } catch (dbErr) {
      console.log("[Notice] DB query in mo-matches failed, using fallbacks.");
    }

    // Step 2: Fallback simulation if DB did not yield case or failed
    const crimes = ['Property Theft', 'Cybercrime', 'Narcotics', 'Violent Homicide', 'Financial Fraud'];
    const districts = ['Bengaluru Urban', 'Belagavi', 'Hubballi-Dharwad', 'Mangaluru', 'Mysuru'];
    
    const moNarratives = {
      'Property Theft': [
        "Forced entry through rear balcony glass pane using glasscutter and suction cups, targeting master bedroom vault.",
        "Night break-in during house-owner out-of-town, using pry bar on front lock, systematically ransacking wooden cupboards.",
        "Unlocked vehicle theft in commercial parking zone using cloned smart-key signals to bypass security protocols.",
        "Snatching of gold chain from morning walkers by two suspects riding a black pulsar motorcycle without license plates.",
        "Two-person lock-picking break-in at retail electronics outlet, stealing mobile devices and cutting CCTV cords."
      ],
      'Cybercrime': [
        "Phishing campaign targeting senior citizens using malicious links disguised as utility bill updates and KYC updates.",
        "Sim-swap fraud bypassing bank OTP verifications, accessing net-banking details using social engineering techniques.",
        "WhatsApp call spoofing representing police officials, demanding online transfers to resolve mock legal inquiries.",
        "Ransomware payload execution on corporate intranet servers via spear-phishing attachments, demanding crypto payments.",
        "Unauthorized administrative server access using compromised credentials, redirecting payments to offshore accounts."
      ],
      'Narcotics': [
        "Interstate narcotic transport concealed in commercial vegetable cargo bags, moving through checkposts at midnight.",
        "Narcotic distribution using encrypted messaging applications for location coordinates and dead-drop payment transfers.",
        "Clandestine distribution of chemical synthetic drugs at upscale private parties using college student intermediaries.",
        "Sale of contraband tablets near educational institutions using local tea-shop stalls as storage and delivery points.",
        "Courier package dispatch of pharmaceutical narcotics under fake documents destined for overseas courier hubs."
      ],
      'Violent Homicide': [
        "Physical assault near parking bays following spatiotemporal road rage argument, using blunt metal iron rods.",
        "Planned gangland retaliation attack on rival syndicate runner near court premises, using sharp machete weapons.",
        "Domestic dispute turning fatal inside residence, assailant fleeing district boundaries immediately after incident.",
        "Corporate executive assassination near residential entry gates by contract riders using illegal country-made firearms.",
        "Lethal assault of security guard during nighttime warehouse dacoity attempt, suspects fleeing in a getaway truck."
      ],
      'Financial Fraud': [
        "Chit-fund investment scam promising 24% annual returns, redirecting depositor funds to shell company bank accounts.",
        "Mock bank official telephone scam collecting credit card details and CVV pins from unsuspecting rural citizens.",
        "Real-estate plot sale forgery using duplicated property title deeds and fake power-of-attorney signatures.",
        "Counterfeit currency distribution in high-volume weekend markets, mixing fake 500-rupee bills into cash drawers.",
        "Corporate tax evasion via dummy invoicing for non-existent software consulting deliverables, funneling cash."
      ]
    };

    if (!targetCase) {
      // Simulate target case
      const targetCrime = crimes[Math.floor(Math.random() * crimes.length)];
      const narratives = moNarratives[targetCrime] || moNarratives['Property Theft'];
      targetCase = {
        fir_number: targetId,
        district: districts[0],
        police_station: 'Cyber Crime PS',
        crime_head: targetCrime,
        mo_description: narratives[0],
        incident_timestamp: '2026-07-25 14:30:00'
      };

      // Simulate pool
      for (let cType of crimes) {
        const narrativesList = moNarratives[cType] || [];
        narrativesList.forEach((moText, idx) => {
          districts.forEach((dName, dIdx) => {
            pool.push({
              fir_number: `KA-${dName.slice(0,3).toUpperCase()}-2026-080${idx*5 + dIdx}`,
              district: dName,
              police_station: `${dName} PS`,
              crime_head: cType,
              mo_description: moText,
              incident_timestamp: '2026-07-24 10:15:00'
            });
          });
        });
      }
    } else {
      if (pool.length === 0) {
        const cat = targetCase.crime_head;
        const narrativesList = moNarratives[cat] || moNarratives['Property Theft'];
        narrativesList.forEach((moText, idx) => {
          districts.forEach((dName, dIdx) => {
            pool.push({
              fir_number: `KA-${dName.slice(0,3).toUpperCase()}-2026-080${idx*5 + dIdx}`,
              district: dName,
              police_station: `${dName} PS`,
              crime_head: cat,
              mo_description: moText,
              incident_timestamp: '2026-07-24 10:15:00'
            });
          });
        });
      }
    }

    // Step 3: Run the TF-IDF Vectorizer
    const targetTokens = tokenize(targetCase.mo_description);
    const targetTF = computeTF(targetTokens);

    const df = {};
    const corpus = [targetCase, ...pool];
    corpus.forEach(doc => {
      const tokens = new Set(tokenize(doc.mo_description));
      tokens.forEach(t => {
        df[t] = (df[t] || 0) + 1;
      });
    });

    const N = corpus.length;
    const idf = {};
    for (const term in df) {
      idf[term] = Math.log(N / df[term]) + 1.0;
    }

    const scoredPool = pool.map(doc => {
      const docTokens = tokenize(doc.mo_description);
      const docTF = computeTF(docTokens);
      const similarity = computeCosineSimilarity(targetTF, docTF, idf);
      
      const commonTerms = targetTokens.filter(t => docTokens.includes(t));
      const uniqCommon = Array.from(new Set(commonTerms)).slice(0, 3);

      return {
        ...doc,
        similarity_score: similarity,
        similarity_percent: Math.round(similarity * 100),
        matched_terms: uniqCommon
      };
    });

    const matches = scoredPool
      .filter(m => m.similarity_score > 0.05)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 5);

    res.status(200).json({
      status: 'success',
      target_case: {
        fir_number: targetCase.fir_number,
        crime_head: targetCase.crime_head,
        mo_description: targetCase.mo_description
      },
      total_compared: pool.length,
      matches
    });

  } catch (error) {
    console.error("[-] Error in GET /api/analytics/mo-matches:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Pre-defined intelligence dossier for Karnataka statewide syndicates
const STATEWIDE_SYNDICATES = [
  {
    id: 'SYN-BGU-01',
    name: 'Koramangala Narcotics Syndicate',
    boss: 'Ramesh Kumar',
    boss_id: 'OFF-KINGPIN-01',
    size: 4,
    territory: 'Bengaluru Urban (Koramangala, Indiranagar, HSR Layout)',
    mo_pattern: 'App-based chemical narcotics delivery & high-profile dead-drops',
    active_warrants: 2,
    status: 'ACTIVE INVESTIGATION'
  },
  {
    id: 'SYN-BLG-02',
    name: 'Belagavi Highway Dacoity Ring',
    boss: 'Sunil Gowda',
    boss_id: 'OFF-002155',
    size: 3,
    territory: 'Belagavi Range (NH-48 checkposts, Dharwad border)',
    mo_pattern: 'Hijacking logistics cargo containers using counterfeit checking credentials',
    active_warrants: 1,
    status: 'CRIMINAL NETWORKS MONITORED'
  },
  {
    id: 'SYN-MYS-03',
    name: 'Mysuru Heritage Theft Syndicate',
    boss: 'Imran Khan',
    boss_id: 'OFF-001042',
    size: 3,
    territory: 'Mysuru District & Chamarajanagar zone',
    mo_pattern: 'Breaking and entering temple vaults, smuggling antiques overseas',
    active_warrants: 3,
    status: 'SURVEILLANCE ACTIVE'
  },
  {
    id: 'SYN-MAN-04',
    name: 'Mangaluru Coastal Contraband Cartel',
    boss: 'Sandeep Shetty',
    boss_id: 'OFF-004081',
    size: 4,
    territory: 'Mangaluru Coastline (Pandeshwar, Ullal, Panambur Port)',
    mo_pattern: 'Smuggling contraband/customs violations using fishing trawlers with spoofed GPS tags',
    active_warrants: 4,
    status: 'SURVEILLANCE ACTIVE'
  },
  {
    id: 'SYN-HUB-05',
    name: 'Hubballi Railway Cargo Theft Ring',
    boss: 'Yallappa Patil',
    boss_id: 'OFF-005112',
    size: 3,
    territory: 'Hubballi Junction & Dharwad Goods Yard',
    mo_pattern: 'Intercepting stationary goods wagons during administrative crew shifts',
    active_warrants: 2,
    status: 'MONITORING NETWORK'
  },
  {
    id: 'SYN-BGU-06',
    name: 'Whitefield Tech Espionage Syndicate',
    boss: 'Vikram Sen',
    boss_id: 'OFF-006090',
    size: 3,
    territory: 'Bengaluru (Whitefield, Outer Ring Road IT Corridors)',
    mo_pattern: 'Corporate network intrusion and selling proprietary source code to overseas intermediaries',
    active_warrants: 1,
    status: 'ACTIVE EXPLOIT DETECTED'
  },
  {
    id: 'SYN-MYS-07',
    name: 'Chamarajanagar Sandalwood Smuggling Gang',
    boss: 'Veerappa Raju',
    boss_id: 'OFF-007122',
    size: 3,
    territory: 'MM Hills Range, Chamarajanagar forest borders',
    mo_pattern: 'Illegal harvesting of protected sandalwood trees and illicit transport via secret compartment trucks',
    active_warrants: 5,
    status: 'FOREST PATROL COOPERATING'
  },
  {
    id: 'SYN-BLG-08',
    name: 'Nippani Tobacco Excise Evasion Syndicate',
    boss: 'Appasaheb Desai',
    boss_id: 'OFF-008033',
    size: 3,
    territory: 'Belagavi border zone (Nippani, Maharashtra-Karnataka checkposts)',
    mo_pattern: 'Smuggling unregistered commercial tobacco loads using falsified e-way bills',
    active_warrants: 2,
    status: 'EXCISE DIVISION ENGAGED'
  },
  {
    id: 'SYN-MAN-09',
    name: 'Udupi Cyber Phishing Cell',
    boss: 'Karthik Poojary',
    boss_id: 'OFF-009115',
    size: 3,
    territory: 'Udupi, Manipal student hubs & coastal towns',
    mo_pattern: 'Executing social engineering campaigns targeting bank customers using forged KYC links',
    active_warrants: 3,
    status: 'CYBER CRIME COHORT ACTIVE'
  },
  {
    id: 'SYN-HUB-10',
    name: 'Dharwad Land Grab Syndicate',
    boss: 'Basavaraj Hiremath',
    boss_id: 'OFF-010221',
    size: 3,
    territory: 'Dharwad Urban periphery & Navalgund taluks',
    mo_pattern: 'Forging mutation deeds of ancestral properties using compromised village registers',
    active_warrants: 1,
    status: 'CIVIL DIVISION COLLUSION MONITOR'
  }
];

// GET /api/syndicates
app.get('/api/syndicates', (req, res) => {
  res.status(200).json({
    status: 'success',
    total_syndicates: STATEWIDE_SYNDICATES.length,
    syndicates: STATEWIDE_SYNDICATES
  });
});

// GET /api/syndicates/:id
app.get('/api/syndicates/:id', (req, res) => {
  const synId = req.params.id;
  const syndicate = STATEWIDE_SYNDICATES.find(s => s.id === synId);
  if (!syndicate) {
    return res.status(404).json({ error: `Syndicate with ID ${synId} not found` });
  }

  let nodes = [];
  let links = [];
  let members = [];

  const suffix = synId.split('-')[2] || '01';
  
  const namesPool = {
    '01': {
      boss: { name: 'Ramesh Kumar', id: 'OFF-KINGPIN-01', age: 46, role: 'Syndicate Boss' },
      members: [
        { name: 'Imran Khan', id: 'OFF-001042', age: 34, role: 'Operations Lead (Lieutenant)', alias: "Imran 'Tech' Khan", warrants: 'Active (Bailable)', bail: 'Out on Bail', risk: 85 },
        { name: 'Pradeep Naik', id: 'OFF-001089', age: 28, role: 'Local Runner', alias: "Pradeep 'Chotta' Naik", warrants: 'None', bail: 'In Custody', risk: 92 },
        { name: 'Sunil Gowda', id: 'OFF-002155', age: 39, role: 'Logistics Specialist', alias: "Sunil 'Express' Gowda", warrants: 'None', bail: 'Out on Bail', risk: 74 }
      ]
    },
    '02': {
      boss: { name: 'Sunil Gowda', id: 'OFF-002155', age: 39, role: 'Syndicate Leader' },
      members: [
        { name: 'Vijay Patil', id: 'OFF-003401', age: 28, role: 'Spotter & Intel', alias: "Vijay 'Spy' Patil", warrants: 'None', bail: 'Out on Bail', risk: 65 },
        { name: 'Praveen Gowda', id: 'OFF-004555', age: 33, role: 'Enforcer', alias: "Praveen 'Hammer' Gowda", warrants: 'None', bail: 'In Custody', risk: 81 }
      ]
    },
    '03': {
      boss: { name: 'Imran Khan', id: 'OFF-001042', age: 34, role: 'Syndicate Leader' },
      members: [
        { name: 'Anand Rao', id: 'OFF-005662', age: 50, role: 'Antique smuggler', alias: "Anand 'Appraiser' Rao", warrants: 'Active (Bailable)', bail: 'Out on Bail', risk: 89 },
        { name: 'Chetana Bhat', id: 'OFF-006771', age: 41, role: 'Evaluator (Insider)', alias: "Chetana 'Scholar' Bhat", warrants: 'None', bail: 'Out on Bail', risk: 61 }
      ]
    },
    '04': {
      boss: { name: 'Sandeep Shetty', id: 'OFF-004081', age: 42, role: 'Cartel Boss' },
      members: [
        { name: 'Guru Prasad', id: 'OFF-004082', age: 31, role: 'Trawler Skipper', alias: "Guru 'Anchor' Prasad", warrants: 'Active (Non-Bailable)', bail: 'Revoked', risk: 87 },
        { name: 'Roshan D\'Souza', id: 'OFF-004083', age: 29, role: 'Receiver', alias: "Roshan 'Port' D'Souza", warrants: 'None', bail: 'In Custody', risk: 72 },
        { name: 'Kiran Ullal', id: 'OFF-004084', age: 35, role: 'Shore Liaison', alias: "Kiran 'Shore' Ullal", warrants: 'Active (Bailable)', bail: 'Out on Bail', risk: 79 }
      ]
    },
    '05': {
      boss: { name: 'Yallappa Patil', id: 'OFF-005112', age: 48, role: 'Ring Leader' },
      members: [
        { name: 'Malleshappa K', id: 'OFF-005113', age: 33, role: 'Wagon Breaker', alias: "Mallesh 'Cutter' K", warrants: 'Active (Bailable)', bail: 'Out on Bail', risk: 83 },
        { name: 'Suresh Dharwad', id: 'OFF-005114', age: 27, role: 'Filer', alias: "Suresh 'Filer' Dharwad", warrants: 'None', bail: 'In Custody', risk: 68 }
      ]
    },
    '06': {
      boss: { name: 'Vikram Sen', id: 'OFF-006090', age: 38, role: 'Lead Architect' },
      members: [
        { name: 'Nikhil R', id: 'OFF-006091', age: 26, role: 'Infiltration Specialist', alias: "Nikhil 'Root' R", warrants: 'None', bail: 'Out on Bail', risk: 94 },
        { name: 'Ananya S', id: 'OFF-006092', age: 30, role: 'Crypto Handler', alias: "Ananya 'Hash' S", warrants: 'Active (Bailable)', bail: 'Out on Bail', risk: 78 }
      ]
    },
    '07': {
      boss: { name: 'Veerappa Raju', id: 'OFF-007122', age: 53, role: 'Forest Kingpin' },
      members: [
        { name: 'Madhaiah Swamy', id: 'OFF-007123', age: 44, role: 'Logistics Supervisor', alias: "Madha 'Ax' Swamy", warrants: 'Active (Non-Bailable)', bail: 'Revoked', risk: 91 },
        { name: 'Kempa N', id: 'OFF-007124', age: 36, role: 'Cutter Driver', alias: "Kempa 'Forest' N", warrants: 'None', bail: 'In Custody', risk: 75 }
      ]
    },
    '08': {
      boss: { name: 'Appasaheb Desai', id: 'OFF-008033', age: 51, role: 'Syndicate Boss' },
      members: [
        { name: 'Shivaji Kadam', id: 'OFF-008034', age: 40, role: 'Transport Manager', alias: "Shivaji 'Border' Kadam", warrants: 'Active (Bailable)', bail: 'Out on Bail', risk: 77 },
        { name: 'Gopal Patil', id: 'OFF-008035', age: 35, role: 'Forged Clerk', alias: "Gopal 'Clerk' Patil", warrants: 'None', bail: 'Out on Bail', risk: 62 }
      ]
    },
    '09': {
      boss: { name: 'Karthik Poojary', id: 'OFF-009115', age: 29, role: 'Cell Coordinator' },
      members: [
        { name: 'Shruthi Hegde', id: 'OFF-009116', age: 24, role: 'Caller Agent', alias: "Shruthi 'KYC' Hegde", warrants: 'None', bail: 'In Custody', risk: 80 },
        { name: 'Aditya Shenoy', id: 'OFF-009117', age: 25, role: 'Mule Account Op', alias: "Aditya 'Mule' Shenoy", warrants: 'Active (Bailable)', bail: 'Out on Bail', risk: 85 }
      ]
    },
    '10': {
      boss: { name: 'Basavaraj Hiremath', id: 'OFF-010221', age: 56, role: 'Liaison Lead' },
      members: [
        { name: 'Rudresh S', id: 'OFF-010222', age: 41, role: 'Document Fabricator', alias: "Rudresh 'Stamp' S", warrants: 'Active (Non-Bailable)', bail: 'Revoked', risk: 86 },
        { name: 'Mallikarjun B', id: 'OFF-010223', age: 49, role: 'Surveyor Spy', alias: "Malli 'Scale' B", warrants: 'None', bail: 'Out on Bail', risk: 69 }
      ]
    }
  };

  const pool = namesPool[suffix] || namesPool['01'];
  
  nodes.push({
    id: pool.boss.id,
    label: pool.boss.name,
    type: 'suspect',
    role: 'Boss',
    age: pool.boss.age,
    gender: 'MALE',
    base_risk_score: syndicate.active_warrants >= 3 ? 98.0 : 85.0
  });

  pool.members.forEach((m, idx) => {
    nodes.push({
      id: m.id,
      label: m.name,
      type: 'suspect',
      role: m.role,
      age: m.age,
      gender: idx % 2 === 0 ? 'MALE' : 'FEMALE',
      base_risk_score: m.risk
    });
  });

  nodes.push({
    id: `LOC-${syndicate.id}`,
    label: `📍 ${syndicate.territory.split('(')[0].trim()}`,
    type: 'location'
  });

  nodes.push({
    id: `KA-${suffix}-2026-0099`,
    label: `KA-${suffix}-2026-0099`,
    type: 'fir'
  });

  links.push({ source: pool.boss.id, target: pool.members[0].id, type: 'syndicate_hierarchy', value: 2 });
  for (let i = 1; i < pool.members.length; i++) {
    links.push({ source: pool.members[0].id, target: pool.members[i].id, type: 'syndicate_hierarchy', value: 1.5 });
  }

  links.push({ source: pool.members[pool.members.length - 1].id, target: `LOC-${syndicate.id}`, type: 'location_proximity', value: 1 });
  links.push({ source: pool.members[0].id, target: `KA-${suffix}-2026-0099`, type: 'co_offending', value: 1 });

  members.push({
    offender_id: pool.boss.id,
    offender_name: pool.boss.name,
    aliases: `${pool.boss.name} 'Boss'`,
    role: pool.boss.role,
    warrants: syndicate.active_warrants > 0 ? 'Active (Non-Bailable)' : 'None',
    bail_status: syndicate.active_warrants > 1 ? 'Revoked' : 'Out on Bail',
    base_risk_score: syndicate.active_warrants >= 3 ? 98.0 : 85.0,
    age: pool.boss.age,
    gender: 'MALE'
  });

  pool.members.forEach((m, idx) => {
    members.push({
      offender_id: m.id,
      offender_name: m.name,
      aliases: m.alias,
      role: m.role,
      warrants: m.warrants,
      bail_status: m.bail,
      base_risk_score: m.risk,
      age: m.age,
      gender: idx % 2 === 0 ? 'MALE' : 'FEMALE'
    });
  });

  res.status(200).json({
    status: 'success',
    syndicate,
    hierarchy: { nodes, links },
    members
  });
});




// 5. GET/POST /api/admin/integrate
app.all('/api/admin/integrate', async (req, res) => {
  try {
    // Extract and set Org ID from request headers or default fallback for QuickML SDK authorization
    const orgId = req.headers['catalyst-org'] || req.headers['CATALYST-ORG'] || '60073769947';
    process.env.X_ZOHO_CATALYST_ORG_ID = orgId;

    const catalystApp = catalyst.initialize(req, { scope: 'admin' });
    
    const DISTRICTS = [
      { name: 'Belagavi', code: 'BEL', key: 'belagavi', envVar: 'QUICKML_KEY_BELAGAVI' },
      { name: 'Bengaluru Urban', code: 'BGU', key: 'bengaluru', envVar: 'QUICKML_KEY_BENGALURU' },
      { name: 'Hubballi-Dharwad', code: 'HBD', key: 'hubballi', envVar: 'QUICKML_KEY_HUBBALLI' },
      { name: 'Mangaluru', code: 'MNG', key: 'mangaluru', envVar: 'QUICKML_KEY_MANGALURU' },
      { name: 'Mysuru', code: 'MYS', key: 'mysure', envVar: 'QUICKML_KEY_MYSURE' }
    ];

    const TARGET_MONTHS = [
      { date: '2026-01-01', year: 2026, month: 1, monthStr: '01' },
      { date: '2026-02-01', year: 2026, month: 2, monthStr: '02' },
      { date: '2026-03-01', year: 2026, month: 3, monthStr: '03' }
    ];

    // Read CSV and calculate thresholds
    const districtThresholds = {};
    for (const dist of DISTRICTS) {
      const fsName = dist.name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
      
      // Resolve CSV path robustly handling local emulation directory structures
      let csvPath = path.join(__dirname, '..', '..', 'forecast_data', 'smoothed', `${fsName}_smoothed.csv`);
      if (!fs.existsSync(csvPath) && __dirname.includes('.build')) {
        const cleanDir = __dirname.replace(/[\/\\]\.build/, '');
        csvPath = path.join(cleanDir, '..', '..', 'forecast_data', 'smoothed', `${fsName}_smoothed.csv`);
      }
      if (!fs.existsSync(csvPath)) {
        csvPath = path.join(process.cwd(), 'forecast_data', 'smoothed', `${fsName}_smoothed.csv`);
      }

      
      if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file for ${dist.name} not found after checking build-local and absolute paths.`);
      }

      
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/);
      const headers = lines[0].split(',');
      const countIdx = headers.indexOf('incident_count');
      if (countIdx === -1) {
        throw new Error(`incident_count column not found in ${csvPath}`);
      }
      
      const counts = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        const count = parseInt(parts[countIdx], 10);
        if (!isNaN(count)) {
          counts.push(count);
        }
      }
      
      const n = counts.length;
      const mean = counts.reduce((sum, val) => sum + val, 0) / n;
      const variance = counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
      const std = Math.sqrt(variance);
      
      districtThresholds[dist.name] = {
        mean,
        std,
        lowLimit: mean - 0.5 * std,
        highLimit: mean + 0.5 * std
      };
    }

    const reportRows = [];
    const failures = [];

    for (const dist of DISTRICTS) {
      const endPointKey = process.env[dist.envVar];
      if (!endPointKey) {
        failures.push({ district: dist.name, month: 'All', error: `Env variable ${dist.envVar} not defined.` });
        continue;
      }
      
      const thresholds = districtThresholds[dist.name];
      
      for (const target of TARGET_MONTHS) {
        const recordId = `DRS-${dist.code}-${target.year}-${target.monthStr}`;
        try {
          // QuickML predict
          const payload = { year_month: target.date };
          const qmlResponse = await catalystApp.quickML().predict(endPointKey, payload);
          
          // Parse value
          const result = qmlResponse.result;
          let predictedVal = null;
          if (result && typeof result === 'object' && !Array.isArray(result)) {
            if (result[target.date] !== undefined) {
              predictedVal = parseFloat(result[target.date]);
            } else {
              const matchKey = Object.keys(result).find(k => k.startsWith(target.date));
              if (matchKey) {
                predictedVal = parseFloat(result[matchKey]);
              }
            }
          } else if (Array.isArray(result)) {
            const item = result.find(row => Object.values(row).some(v => typeof v === 'string' && v.startsWith(target.date)));
            if (item) {
              const valKey = Object.keys(item).find(k => k !== 'year_month' && typeof item[k] === 'number');
              if (valKey) {
                predictedVal = parseFloat(item[valKey]);
              }
            }
          }
          
          if (predictedVal === null || isNaN(predictedVal)) {
            throw new Error(`Could not parse forecast value for ${target.date} from: ${JSON.stringify(qmlResponse)}`);
          }

          const roundedCount = Math.round(predictedVal);
          
          // Classify risk
          let riskLevel = 'MED';
          if (predictedVal > thresholds.highLimit) {
            riskLevel = 'HIGH';
          } else if (predictedVal < thresholds.lowLimit) {
            riskLevel = 'LOW';
          }

          // Idempotent upsert
          const existQuery = `SELECT ROWID FROM District_Risk_Scores WHERE record_id = '${recordId}'`;
          const queryResult = await catalystApp.zcql().executeZCQLQuery(existQuery);
          const flatRows = flattenResults(queryResult);
          
          const dbTable = catalystApp.datastore().table('District_Risk_Scores');
          let dbStatus = '';
          
          if (flatRows.length > 0) {
            const rowId = flatRows[0].ROWID || flatRows[0].rowid;
            await dbTable.updateRow({
              ROWID: rowId,
              record_id: recordId,
              district: dist.name,
              statistical_month: target.month,
              statistical_year: target.year,
              base_incident_count: roundedCount,
              predicted_risk_level: riskLevel
            });
            dbStatus = 'UPDATED';
          } else {
            await dbTable.insertRow({
              record_id: recordId,
              district: dist.name,
              statistical_month: target.month,
              statistical_year: target.year,
              base_incident_count: roundedCount,
              predicted_risk_level: riskLevel
            });
            dbStatus = 'INSERTED';
          }

          reportRows.push({
            district: dist.name,
            month: `${target.year}-${target.monthStr}`,
            forecast: roundedCount,
            risk: riskLevel,
            status: dbStatus
          });
        } catch (err) {
          failures.push({
            district: dist.name,
            month: `${target.year}-${target.monthStr}`,
            error: err.message
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      report: reportRows,
      failures: failures,
      warning: reportRows.some(r => r.district === 'Bengaluru Urban') 
        ? "Bengaluru Urban forecast accuracy under review — values written as-is pending later validation." 
        : null
    });
  } catch (error) {
    console.error("[-] Error in POST /api/admin/integrate:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 6. POST /api/fir/inject
app.post('/api/fir/inject', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req, { scope: 'admin' });
    const result = await injectFIRRecord(catalystApp, req.body);
    res.status(200).json({
      success: true,
      message: "FIR successfully injected into Catalyst Data Store!",
      fir: result.firRow,
      suspect: result.suspectInfo
    });
  } catch (error) {
    console.error("[-] Error in POST /api/fir/inject:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 7. GET /api/admin/backfill
app.get('/api/admin/backfill', async (req, res) => {
  try {
    let csvPath = path.join(__dirname, '..', '..', 'offenders_seed.csv');
    if (!fs.existsSync(csvPath)) {
      csvPath = path.join(process.cwd(), 'offenders_seed.csv');
    }
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: `offenders_seed.csv not found at path: ${csvPath}` });
    }
    
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/);
    if (lines.length <= 1) {
      return res.status(400).json({ error: "CSV file is empty or invalid" });
    }
    
    const headers = lines[0].split(',');
    const nameIdx = headers.indexOf('offender_name');
    const idIdx = headers.indexOf('offender_id');
    
    if (nameIdx === -1 || idIdx === -1) {
      return res.status(400).json({ error: "Required columns 'offender_name' and 'offender_id' not found in CSV." });
    }
    
    const nameToId = new Map();
    let nextId = 1;
    
    // Pass 1: Gather all unique offender names and assign sequential IDs
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      const name = parts[nameIdx].trim();
      if (name && !nameToId.has(name)) {
        nameToId.set(name, `OFF-${String(nextId).padStart(6, '0')}`);
        nextId++;
      }
    }
    
    // Pass 2: Re-generate CSV rows with stable offender_id
    const outputLines = [lines[0]];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      const name = parts[nameIdx].trim();
      const stableId = nameToId.get(name) || parts[idIdx];
      parts[idIdx] = stableId;
      outputLines.push(parts.join(','));
    }
    
    fs.writeFileSync(csvPath, outputLines.join('\n'), 'utf8');
    
    res.status(200).json({
      success: true,
      message: "offenders_seed.csv successfully backfilled with stable offender_ids!",
      total_rows: outputLines.length - 1,
      unique_offenders: nameToId.size
    });
  } catch (error) {
    console.error("[-] Error in GET /api/admin/backfill:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// AI database query endpoint
// --- AGENT UTILITIES AND REACT LOOP ---

/**
 * Retrieve FIR incident counts and breakdown for a specified district, optionally filtered by crime type and date range.
 */
async function get_fir_stats(catalystApp, district, crimeType = null, startDate = null, endDate = null) {
  try {
    let conditions = [`district = '${district.replace(/'/g, "''")}'`];
    if (crimeType) {
      const typeLower = crimeType.toLowerCase().trim();
      if (typeLower.includes('theft') || typeLower.includes('property')) {
        conditions.push(`(crime_head LIKE '%Theft%' OR crime_head LIKE '%Robbery%' OR crime_head LIKE '%Burglary%' OR crime_head LIKE '%Extortion%' OR crime_head LIKE '%Dacoity%')`);
      } else if (typeLower.includes('cyber') || typeLower.includes('online')) {
        conditions.push(`(crime_head LIKE '%Cyber%' OR crime_head LIKE '%IT Act%' OR crime_head LIKE '%Information Technology%' OR crime_head LIKE '%Online%')`);
      } else if (typeLower.includes('narcotic') || typeLower.includes('drug') || typeLower.includes('liquor') || typeLower.includes('excise') || typeLower.includes('prohibition')) {
        conditions.push(`(crime_head LIKE '%Narcotic%' OR crime_head LIKE '%Drug%' OR crime_head LIKE '%Liquor%' OR crime_head LIKE '%Excise%' OR crime_head LIKE '%Prohibition%')`);
      } else if (typeLower.includes('violent') || typeLower.includes('murder') || typeLower.includes('assault') || typeLower.includes('hurt') || typeLower.includes('rape') || typeLower.includes('pocso')) {
        conditions.push(`(crime_head LIKE '%Murder%' OR crime_head LIKE '%Homicide%' OR crime_head LIKE '%Assault%' OR crime_head LIKE '%Hurt%' OR crime_head LIKE '%Rape%' OR crime_head LIKE '%POCSO%' OR crime_head LIKE '%Kidnapping%' OR crime_head LIKE '%Abduction%')`);
      } else if (typeLower.includes('financial') || typeLower.includes('cheat') || typeLower.includes('fraud') || typeLower.includes('forgery')) {
        conditions.push(`(crime_head LIKE '%Cheating%' OR crime_head LIKE '%Forgery%' OR crime_head LIKE '%Fraud%' OR crime_head LIKE '%Counterfeit%')`);
      } else {
        conditions.push(`crime_head LIKE '%${crimeType.replace(/'/g, "''")}%'`);
      }
    }
    if (startDate) {
      conditions.push(`incident_timestamp >= '${startDate.replace(/'/g, "''")}'`);
    }
    if (endDate) {
      conditions.push(`incident_timestamp <= '${endDate.replace(/'/g, "''")}'`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Query count
    const countQuery = `SELECT COUNT(fir_number) FROM FIR_Records ${where}`;
    const countRes = await catalystApp.zcql().executeZCQLQuery(countQuery);
    const totalCount = parseInt(flattenResults(countRes)[0]['COUNT(fir_number)']) || 0;

    // Query breakdown
    const breakdownQuery = `SELECT crime_head, COUNT(fir_number) FROM FIR_Records ${where} GROUP BY crime_head`;
    const breakdownRes = await catalystApp.zcql().executeZCQLQuery(breakdownQuery);
    const breakdown = flattenResults(breakdownRes).map(r => ({
      crime_head: r.crime_head,
      count: parseInt(r['COUNT(fir_number)']) || 0
    }));

    return {
      district,
      total_count: totalCount,
      crime_type_filter: crimeType,
      start_date_filter: startDate,
      end_date_filter: endDate,
      breakdown: breakdown
    };
  } catch (err) {
    return { error: `Failed to query FIR stats: ${err.message}` };
  }
}

/**
 * Retrieve the current statistical and ARIMA-forecasted risk score for a specific district.
 */
async function get_district_risk_score(catalystApp, district) {
  try {
    const query = `SELECT record_id, district, statistical_month, statistical_year, base_incident_count, predicted_risk_level FROM District_Risk_Scores WHERE district = '${district.replace(/'/g, "''")}' ORDER BY statistical_year DESC, statistical_month DESC LIMIT 1`;
    const res = await catalystApp.zcql().executeZCQLQuery(query);
    const flat = flattenResults(res);
    if (flat.length === 0) {
      return { error: `No risk score found for district: ${district}` };
    }
    const row = flat[0];
    return {
      district: row.district,
      forecasted_incident_count: parseInt(row.base_incident_count) || 0,
      predicted_risk_level: row.predicted_risk_level,
      period: `${row.statistical_year}-${String(row.statistical_month).padStart(2, '0')}`,
      record_id: row.record_id
    };
  } catch (err) {
    return { error: `Failed to query risk score: ${err.message}` };
  }
}

/**
 * Retrieve month-by-month crime incident trends for a district over a specified number of historical months.
 */
async function get_crime_trend(catalystApp, district, months = 12) {
  try {
    const limit = parseInt(months, 10) || 12;
    const query = `SELECT statistical_month, statistical_year, base_incident_count, predicted_risk_level FROM District_Risk_Scores WHERE district = '${district.replace(/'/g, "''")}' ORDER BY statistical_year DESC, statistical_month DESC LIMIT ${limit}`;
    const res = await catalystApp.zcql().executeZCQLQuery(query);
    const flat = flattenResults(res);
    if (flat.length === 0) {
      return { error: `No crime trend records found for district: ${district}` };
    }
    const sorted = flat.map(row => ({
      period: `${row.statistical_year}-${String(row.statistical_month).padStart(2, '0')}`,
      incident_count: parseInt(row.base_incident_count) || 0,
      risk_level: row.predicted_risk_level
    })).reverse();
    
    return {
      district,
      trend: sorted
    };
  } catch (err) {
    return { error: `Failed to query crime trend: ${err.message}` };
  }
}

/**
 * Robustly parses arguments for tools whether they are valid JSON objects, key-value pairs, or string literals.
 */
function parseArgs(argsStr) {
  const trimmed = argsStr.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      try {
        const doubleQuoted = trimmed
          .replace(/'/g, '"')
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        return JSON.parse(doubleQuoted);
      } catch (err) {
        console.error("Failed to parse JSON-like arguments:", trimmed, err);
      }
    }
  }

  const kvMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*=\s*(["']?)([\s\S]*?)\2$/);
  if (kvMatch) {
    return { [kvMatch[1]]: kvMatch[3] };
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const content = trimmed.slice(1, -1);
    if (content.toLowerCase().startsWith('select')) {
      return { sql: content };
    }
    if (content.startsWith('KA-')) {
      return { fir_number: content };
    }
    return { value: content };
  }

  if (trimmed.toLowerCase().startsWith('select')) {
    return { sql: trimmed };
  }
  if (trimmed.startsWith('KA-')) {
    return { fir_number: trimmed };
  }

  return { value: trimmed };
}

/**
 * Call the high-intelligence Gemini 2.5 Pro model in active thinking mode for strategic analysis.
 */
async function queryReasoningModel(prompt, apiKey, oauthToken) {
  const payload = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
    generationConfig: {
      thinkingConfig: {
        thinkingBudget: 2048
      }
    }
  };
  const response = await callGeminiREST(REASONER_MODEL, payload, apiKey, oauthToken);
  if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts[0]) {
    return response.candidates[0].content.parts[0].text;
  }
  return JSON.stringify(response);
}

/**
 * Perform spatiotemporal statistical trend analysis over database tables.
 */
async function analyzeCrimeTrends(catalystApp, district, crimeHead) {
  let conditions = [];
  if (district) conditions.push(`district = '${district.replace(/'/g, "''")}'`);
  if (crimeHead) conditions.push(`crime_head = '${crimeHead.replace(/'/g, "''")}'`);
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  let statisticalQuery = `SELECT district, statistical_month, statistical_year, base_incident_count, predicted_risk_level FROM District_Risk_Scores ${whereClause} ORDER BY statistical_year DESC, statistical_month DESC LIMIT 20`;
  const statResult = await catalystApp.zcql().executeZCQLQuery(statisticalQuery);
  const stats = flattenResults(statResult);
  
  if (stats.length === 0) {
    return "No statistical risk records found to analyze trends.";
  }
  
  const districtAverages = {};
  stats.forEach(row => {
    const d = row.district;
    if (!districtAverages[d]) districtAverages[d] = [];
    districtAverages[d].push(row.base_incident_count);
  });
  
  let analysis = `### SPATIOTEMPORAL CRIME TREND ANALYSIS\n`;
  if (district) analysis += `* **Target District:** ${district}\n`;
  if (crimeHead) analysis += `* **Target Offense Class:** ${crimeHead}\n`;
  analysis += `* **Recent Trend Logs analysed:** ${stats.length} statistical rows.\n\n`;
  
  analysis += `| District | Recent Month Stats | MoM Indicator / Risk Level |\n`;
  analysis += `|---|---|---|\n`;
  
  Object.keys(districtAverages).forEach(d => {
    const counts = districtAverages[d];
    const latest = counts[0] || 0;
    const previous = counts[1] || latest;
    const diff = latest - previous;
    const percentChange = previous > 0 ? ((diff / previous) * 100).toFixed(1) : 0;
    
    const indicator = diff > 0 ? `▲ +${percentChange}% (Rising Trend)` : diff < 0 ? `▼ ${percentChange}% (Declining Trend)` : `■ Stable`;
    const rowData = stats.find(s => s.district === d);
    const riskLevel = rowData ? rowData.predicted_risk_level : "UNKNOWN";
    
    analysis += `| ${d} | Latest: ${latest} cases (Previous: ${previous}) | ${indicator} | Risk: ${riskLevel} |\n`;
  });
  
  return analysis;
}

/**
 * Fetch simulated KSP intelligence advisories and security warnings.
 */
function fetchIntelligenceFeed(query) {
  const feed = [
    {
      id: "SEC-2026-001",
      date: "2026-06-15",
      category: "Cybercrime",
      district: "Bengaluru Urban",
      title: "Phishing Campaign Targeting Public Sector Employees in Bengaluru",
      summary: "A coordinated phishing campaign utilizing fake utility bill alerts has been detected. Several state employees have reported credential theft. Highly correlated with cybercrime spikes in Bengaluru Urban."
    },
    {
      id: "SEC-2026-002",
      date: "2026-06-18",
      category: "Narcotics",
      district: "Belagavi",
      title: "Interstate Smuggling Route Intercepted near Belagavi Border",
      summary: "Local border patrols seized a contraband transport along the NH-48 corridor. Intelligence reports indicate an active transit network operating between Maharashtra and north Karnataka districts."
    },
    {
      id: "SEC-2026-003",
      date: "2026-06-19",
      category: "Theft",
      district: "Mysuru",
      title: "Security Advisory: High-Density Gatherings in Mysuru",
      summary: "Upcoming processions and assemblies in Mysuru district are expected to draw large crowds. Security forces are advised to monitor transit routes and crime hotspots to prevent pickpocketing and minor thefts."
    },
    {
      id: "SEC-2026-004",
      date: "2026-06-20",
      category: "Financial Crimes",
      district: "Hubballi-Dharwad",
      title: "Rise in Fake Investment App Frauds in Hubballi",
      summary: "A surge in reports of fraudulent 'instant doubling' WhatsApp groups has been observed in Hubballi-Dharwad. Perpetrators are leveraging local business directories to target retail merchants."
    },
    {
      id: "SEC-2026-005",
      date: "2026-06-20",
      category: "Violent Crimes",
      district: "Bengaluru Urban",
      title: "Protest Advisory: Outer Ring Road",
      summary: "Citizen groups have scheduled peaceful marches on the Outer Ring Road in Bengaluru Urban over infrastructural disputes. Local stations are advised to pre-emptively manage traffic grids and deployment coordinates."
    }
  ];
  
  if (!query) return JSON.stringify(feed);
  
  const lower = query.toLowerCase();
  const filtered = feed.filter(item => 
    item.title.toLowerCase().includes(lower) || 
    item.summary.toLowerCase().includes(lower) || 
    item.district.toLowerCase().includes(lower) ||
    item.category.toLowerCase().includes(lower)
  );
  
  return JSON.stringify(filtered);
}

/**
 * Executes a reasoning agent tool using Zoho Catalyst SDK.
 */
async function executeAgentTool(catalystApp, toolName, args, authOptions = {}) {
  console.log(`[Ashen Agent Tool] Invoking ${toolName} with args:`, args);
  try {
    switch (toolName) {
      case 'get_fir_stats': {
        const district = args.district;
        if (!district) return "Error: Missing 'district' parameter.";
        const crimeType = args.crime_type || null;
        const startDate = args.start_date || null;
        const endDate = args.end_date || null;
        const res = await get_fir_stats(catalystApp, district, crimeType, startDate, endDate);
        return JSON.stringify(res);
      }
      
      case 'get_district_risk_score': {
        const district = args.district;
        if (!district) return "Error: Missing 'district' parameter.";
        const res = await get_district_risk_score(catalystApp, district);
        return JSON.stringify(res);
      }
      
      case 'get_crime_trend': {
        const district = args.district;
        if (!district) return "Error: Missing 'district' parameter.";
        const months = args.months !== undefined ? parseInt(args.months, 10) : 12;
        const res = await get_crime_trend(catalystApp, district, months);
        return JSON.stringify(res);
      }
      
      case 'trace_accomplices': {
        const fir = args.fir_number;
        if (!fir) return "Error: Missing 'fir_number' parameter.";
        const escapedFir = fir.replace(/'/g, "''");
        const primaryQuery = `SELECT offender_id, offender_name FROM Offenders WHERE associated_fir_number = '${escapedFir}'`;
        const primaryResult = await catalystApp.zcql().executeZCQLQuery(primaryQuery);
        const flatPrimary = flattenResults(primaryResult);
        
        if (flatPrimary.length === 0) {
          return `No suspects or offenders are registered in the datastore for FIR ${fir}`;
        }
        
        const ids = flatPrimary.map(r => r.offender_id).filter(Boolean);
        if (ids.length === 0) {
          return `No offender IDs registered under FIR ${fir}`;
        }

        const idConditions = ids.map(id => `offender_id = '${id.replace(/'/g, "''")}'`).join(' OR ');
        const relationQuery = `SELECT associated_fir_number, offender_id, offender_name, age, gender, base_risk_score FROM Offenders WHERE ${idConditions}`;
        const relationResult = await catalystApp.zcql().executeZCQLQuery(relationQuery);
        const flatRelations = flattenResults(relationResult);
        return JSON.stringify(flatRelations);
      }
      
      case 'file_fir': {
        const inputData = {
          district: args.district,
          police_station: args.police_station,
          crime_head: args.crime_head,
          mo_description: args.mo_description,
          offender_name: args.offender_name,
          age: args.age,
          gender: args.gender
        };
        const result = await injectFIRRecord(catalystApp, inputData);
        return JSON.stringify({
          success: true,
          fir_number: result.firRow.fir_number,
          district: result.firRow.district,
          police_station: result.firRow.police_station,
          crime_head: result.firRow.crime_head,
          suspect: result.suspectInfo
        });
      }

      case 'fetch_intelligence_feed': {
        const query = args.query || null;
        return fetchIntelligenceFeed(query);
      }
      
      default:
        return `Error: Unknown tool '${toolName}' requested.`;
    }
  } catch (error) {
    return `Error executing tool: ${error.message}`;
  }
}

/**
 * Call the Gemini API directly using Node.js native https module (Generative Language generateContent endpoint).
 */
function callGeminiREST(modelName, payload, apiKey, oauthToken) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    
    const headers = {
      'Content-Type': 'application/json'
    };

    // Google's new Authorization Keys (AQ.Ab...) must be sent in the 'x-goog-api-key' header
    // rather than passed in the query string as ?key=... to avoid authentication credentials mismatch.
    const activeApiKey = apiKey && apiKey.trim() !== '' ? apiKey : null;
    if (activeApiKey) {
      headers['x-goog-api-key'] = activeApiKey;
    } else if (oauthToken) {
      headers['Authorization'] = `Bearer ${oauthToken}`;
    }

    const parsedUrl = new URL(url);

    const options = {
      method: 'POST',
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error ? parsed.error.message : `HTTP status ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Executes a callGeminiREST request with transient error retry (exponential backoff) for 502/503/504 and rate limit 429 errors.
 */
async function callGeminiRESTWithRetry(modelName, payload, apiKey, oauthToken, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callGeminiREST(modelName, payload, apiKey, oauthToken);
    } catch (err) {
      const errMsg = err.message || '';
      const isTransient = errMsg.includes('503') || errMsg.includes('502') || errMsg.includes('504') || 
                          errMsg.includes('429') || errMsg.includes('timeout') || errMsg.includes('ECONNRESET');
      if (isTransient && i < retries - 1) {
        console.warn(`[Gemini API] Transient error detected (${errMsg}). Retrying in ${delay}ms (attempt ${i + 1}/${retries})...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      throw err;
    }
  }
}

/**
 * Runs a multi-step Reasoning & Action (ReAct) agent loop using Gemini.
 */
/**
 * Runs a multi-step Reasoning & Action (ReAct) agent loop using Gemini.
 * Left fully intact but dormant, gated behind the provider switch.
 */
async function runGeminiAgent(catalystApp, userPrompt, authOptions) {
  const { apiKey, oauthToken } = authOptions;
  if (!apiKey && !oauthToken) {
    throw new Error("Neither GEMINI_API_KEY nor Google OAuth token is provided.");
  }

  // Define native schemas for Gemini function calling
  const toolDeclarations = [
    {
      name: "get_fir_stats",
      description: "Retrieve FIR incident counts and breakdown for a specified district, optionally filtered by crime type and date range.",
      parameters: {
        type: "OBJECT",
        properties: {
          district: {
            type: "STRING",
            description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
          },
          crime_type: {
            type: "STRING",
            description: "Optional crime head category (e.g. Theft, Cybercrime, Narcotics & Excise, Violent Crimes, Financial Crimes)."
          },
          start_date: {
            type: "STRING",
            description: "Optional start date filter in YYYY-MM-DD format."
          },
          end_date: {
            type: "STRING",
            description: "Optional end date filter in YYYY-MM-DD format."
          }
        },
        required: ["district"]
      }
    },
    {
      name: "get_district_risk_score",
      description: "Retrieve the current statistical and ARIMA-forecasted risk score for a specific district.",
      parameters: {
        type: "OBJECT",
        properties: {
          district: {
            type: "STRING",
            description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
          }
        },
        required: ["district"]
      }
    },
    {
      name: "get_crime_trend",
      description: "Retrieve month-by-month historical crime incident trends for a district over a specified number of months.",
      parameters: {
        type: "OBJECT",
        properties: {
          district: {
            type: "STRING",
            description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
          },
          months: {
            type: "INTEGER",
            description: "Optional number of historical months to retrieve trend data for (default is 12)."
          }
        },
        required: ["district"]
      }
    },
    {
      name: "trace_accomplices",
      description: "Fetch the criminal network or accomplices registered under a specific FIR number.",
      parameters: {
        type: "OBJECT",
        properties: {
          fir_number: {
            type: "STRING",
            description: "The associated FIR number to trace (e.g., KA-BGU-2023-000002)."
          }
        },
        required: ["fir_number"]
      }
    },
    {
      name: "file_fir",
      description: "Files a live FIR complaint and creates an optional suspect profile in the datastore.",
      parameters: {
        type: "OBJECT",
        properties: {
          district: {
            type: "STRING",
            description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
          },
          police_station: {
            type: "STRING",
            description: "Optional name of the police station."
          },
          crime_head: {
            type: "STRING",
            description: "Optional crime head category (e.g. Theft, Cybercrime, Narcotics & Excise, Violent Crimes, Financial Crimes)."
          },
          mo_description: {
            type: "STRING",
            description: "Narrative description of the crime's modus operandi."
          },
          offender_name: {
            type: "STRING",
            description: "Optional name of the offender/suspect."
          },
          age: {
            type: "INTEGER",
            description: "Optional age of the suspect."
          },
          gender: {
            type: "STRING",
            description: "Optional gender of the suspect (MALE, FEMALE, TRANSGENDER)."
          }
        },
        required: ["district", "mo_description"]
      }
    },
    {
      name: "fetch_intelligence_feed",
      description: "Search simulated live security advisories, current events, border patrol reports, and weather alerts in Karnataka.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: {
            type: "STRING",
            description: "Optional keyword or district name to filter security advisories."
          }
        }
      }
    }
  ];

  const tools = [
    { functionDeclarations: toolDeclarations }
  ];

  const coordinatorSystemInstruction = `You are the Ashen Copilot Coordinator (Gemini 2.5 Flash).
Your role is to collect all relevant database statistics, risk scores, historical crime trends, and internal context needed to answer the officer's query.
You must call the appropriate database tools (functions) to gather this data.
Do NOT try to answer the query yourself or perform deep analytical reasoning. Your sole objective is to gather internal facts using the provided database tools.
If the query requires external news, real-world context, or current event searches, the downstream Reasoner (Gemini 2.5 Pro) will perform web search grounding.
Once you have executed all relevant database tools and collected the facts, summarize them clearly in a structured list of gathered facts, and end your response.`;

  // Start history contents
  let contents = [
    {
      role: 'user',
      parts: [{ text: userPrompt }]
    }
  ];

  const steps = [];
  let currentTurn = 0;
  const maxTurns = 5;
  const uniqueCitations = new Map(); // Maps URI -> Title

  while (currentTurn < maxTurns) {
    currentTurn++;
    console.log(`[Coordinator Agent] Loop iteration ${currentTurn}...`);

    const payload = {
      contents: contents,
      tools: tools,
      systemInstruction: {
        parts: [{ text: coordinatorSystemInstruction }]
      }
    };

    const response = await callGeminiRESTWithRetry(COORDINATOR_MODEL, payload, apiKey, oauthToken);
    
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error(`Invalid Gemini response candidates: ${JSON.stringify(response)}`);
    }

    const candidate = response.candidates[0];
    const responseContent = candidate.content;
    const parts = responseContent.parts || [];

    // Extract search grounding metadata if available
    if (candidate.groundingMetadata) {
      const chunks = candidate.groundingMetadata.groundingChunks || [];
      chunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri) {
          uniqueCitations.set(chunk.web.uri, chunk.web.title || "Web Resource");
        }
      });
    }

    // Filter parts for function calls
    const functionCalls = parts.filter(p => p.functionCall);

    if (functionCalls.length > 0) {
      // Execute each function call
      const functionResponses = [];

      steps.push({
        type: 'thought',
        content: `Coordinator decided to invoke tools: ${functionCalls.map(c => c.functionCall.name).join(', ')}`
      });

      for (const callPart of functionCalls) {
        const callObj = callPart.functionCall;
        const toolName = callObj.name;
        const toolArgs = callObj.args || {};

        steps.push({
          type: 'action',
          content: `Invoking tool ${toolName} with arguments: ${JSON.stringify(toolArgs)}`
        });

        let observation;
        try {
          const resultStr = await executeAgentTool(catalystApp, toolName, toolArgs, { apiKey, oauthToken });
          // Parse result to check if it's already a JSON structure, or wrap it
          let parsedResult;
          try {
            parsedResult = JSON.parse(resultStr);
            if (typeof parsedResult !== 'object' || parsedResult === null) {
              parsedResult = { result: resultStr };
            }
          } catch (e) {
            parsedResult = { result: resultStr };
          }
          observation = parsedResult;
        } catch (err) {
          console.error(`[-] Error executing tool ${toolName}:`, err);
          observation = { error: `Failed to execute tool: ${err.message}` };
        }

        steps.push({
          type: 'observation',
          content: JSON.stringify(observation)
        });

        // Accumulate tool response for execution turn
        functionResponses.push({
          name: toolName,
          response: observation
        });
      }

      // Add the model's turn to history
      contents.push({
        role: 'model',
        parts: parts
      });

      // Add the function responses turn to history
      contents.push({
        role: 'function',
        parts: functionResponses.map(fr => ({
          functionResponse: fr
        }))
      });

    } else {
      // Coordinator returned a text response without any function calls, which means data gathering is complete!
      const coordinatorSummary = parts.map(p => p.text).filter(Boolean).join('\n');
      console.log(`[Coordinator summary of gathered facts]:\n`, coordinatorSummary);

      steps.push({
        type: 'thought',
        content: "Coordinator completed gathering facts. Proceeding to strategic reasoning synthesis..."
      });

      // Break loop
      break;
    }
  }

  // Compile trace of tool queries
  let gatheredFactsText = "";
  steps.forEach(step => {
    if (step.type === 'action') {
      gatheredFactsText += `\n* **Tool Call:** ${step.content}`;
    } else if (step.type === 'observation') {
      gatheredFactsText += `\n  **Result:** ${step.content}`;
    }
  });

  // Compile search citations
  let searchMetadataText = "";
  if (uniqueCitations.size > 0) {
    searchMetadataText += "\n\n### Grounded Web Search Sources:\n";
    uniqueCitations.forEach((title, uri) => {
      searchMetadataText += `- [${title}](${uri})\n`;
    });
  }

  // Synthesize with Reasoner model (gemini-2.5-pro)
  const reasonerSystemInstruction = `You are the Ashen Copilot Strategic Reasoner (Gemini 2.5 Pro).
Your job is to synthesize a brief, executive-level Palantir Gotham intelligence report based on the officer's query and gathered facts.
CRITICAL FORMATTING RULES:
1. Keep the output CONCISE, HIGH-YIELD, and DIRECT (under 150-200 words). Avoid overwhelming boilerplates or long tables.
2. Structure your response clearly into 3 short sections:
   - **SUMMARY**: Quick overview with District, Period, Forecasted Count, and Risk Tier badge (🔴 HIGH / 🟡 MED / 🟢 LOW).
   - **KEY INSIGHTS & THREATS**: 2-3 short bullet points on trends and high-priority indicators.
   - **ACTIONABLE RECOMMENDATIONS**: 2 concise, clear steps for response.
3. Cite specific numbers from the datastore. If web sources are referenced, include clickable Markdown citations inline [Title](URL). Keep 'SOURCES & CITATIONS' brief at the end.`;

  const reasonerPrompt = `Officer's query: "${userPrompt}"

The Coordinator has gathered the following internal datastore records and external search results:

--- GATHERED FACTS ---
${gatheredFactsText}

${searchMetadataText}

Please synthesize your final strategic intelligence report now.`;

  const reasonerPayload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: reasonerPrompt }]
      }
    ],
    // Let Pro also have search grounding tool enabled so it can ground its final report if needed
    tools: [
      { google_search: {} }
    ],
    systemInstruction: {
      parts: [{ text: reasonerSystemInstruction }]
    },
    generationConfig: {
      thinkingConfig: {
        thinkingBudget: 2048
      }
    }
  };

  console.log("[Reasoner Agent] Invoking Gemini 2.5 Pro...");
  let reasonerResponse;
  let fallbackUsed = false;
  try {
    reasonerResponse = await callGeminiRESTWithRetry(REASONER_MODEL, reasonerPayload, apiKey, oauthToken);
  } catch (proErr) {
    console.warn(`[Gemini Reasoner] Pro model (${REASONER_MODEL}) failed: ${proErr.message}. Falling back to Flash (${COORDINATOR_MODEL}).`);
    fallbackUsed = true;
    const fallbackPayload = JSON.parse(JSON.stringify(reasonerPayload));
    if (fallbackPayload.generationConfig) {
      delete fallbackPayload.generationConfig.thinkingConfig;
    }
    reasonerResponse = await callGeminiRESTWithRetry(COORDINATOR_MODEL, fallbackPayload, apiKey, oauthToken);
  }
  
  if (!reasonerResponse.candidates || reasonerResponse.candidates.length === 0) {
    throw new Error(`Invalid Reasoner response candidates: ${JSON.stringify(reasonerResponse)}`);
  }

  let reasonerText = reasonerResponse.candidates[0].content.parts[0].text;
  if (fallbackUsed) {
    reasonerText = "*(Note: Gemini 2.5 Pro quota exceeded. Synthesized using Gemini 2.5 Flash fallback.)*\n\n" + reasonerText;
  }
  console.log("[Reasoner Response Completed]");

  // Extract grounding metadata from the reasoner response if any
  if (reasonerResponse.candidates[0].groundingMetadata) {
    const chunks = reasonerResponse.candidates[0].groundingMetadata.groundingChunks || [];
    chunks.forEach(chunk => {
      if (chunk.web && chunk.web.uri) {
        uniqueCitations.set(chunk.web.uri, chunk.web.title || "Web Resource");
      }
    });
  }

  // Format citations list to append if not already present
  let finalCitationsSection = "";
  if (uniqueCitations.size > 0 && !reasonerText.toLowerCase().includes('sources & citations')) {
    finalCitationsSection += "\n\n### SOURCES & CITATIONS\n";
    uniqueCitations.forEach((title, uri) => {
      finalCitationsSection += `- [${title}](${uri})\n`;
    });
  }

  return {
    success: true,
    steps: steps,
    response: reasonerText + finalCitationsSection
  };
}

/**
 * Call Tavily REST Search API.
 */
function callTavilySearch(query, apiKey) {
  const https = require('https');
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: "basic"
    });
    const options = {
      hostname: 'api.tavily.com',
      path: '/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && Array.isArray(parsed.results)) {
            const formatted = parsed.results.map(r => ({
              title: r.title,
              url: r.url,
              snippet: r.content
            }));
            resolve({ results: formatted });
          } else {
            resolve({ error: `Tavily API responded with error: ${data}` });
          }
        } catch (e) {
          resolve({ error: `Failed to parse Tavily response: ${data}` });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ error: `Tavily network error: ${err.message}` });
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Execute web search query via Tavily API if TAVILY_API_KEY is configured,
 * otherwise fallback to local simulated intelligence feed search.
 */
async function executeWebSearchTool(query) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey && tavilyKey.trim() !== '') {
    console.log(`[Web Search] Executing Tavily search for: "${query}"`);
    return await callTavilySearch(query, tavilyKey);
  }
  
  // Fallback to simulated intelligence feed search
  console.log(`[Web Search] TAVILY_API_KEY not configured. Falling back to local simulated feed search for: "${query}"`);
  const simulatedFeed = fetchIntelligenceFeed(query);
  let parsedFeed = [];
  try {
    parsedFeed = JSON.parse(simulatedFeed);
  } catch (e) {
    parsedFeed = [];
  }
  
  const results = parsedFeed.map(item => ({
    title: item.title,
    url: `http://localhost:3000/app/#alert-${item.id}`,
    snippet: item.summary
  }));
  
  return {
    results: results,
    warning: "Live web search is disabled because TAVILY_API_KEY is not configured. Displaying local simulated intelligence advisories instead."
  };
}

 /**
 * Runs a multi-step native tool-calling agent loop using Cerebras Cloud (gpt-oss-120b).
 */
async function runCerebrasAgent(catalystApp, userPrompt, authOptions) {
  const { getCerebrasClient } = require('./cerebrasClient');
  const client = getCerebrasClient();
  
  // gpt-oss-120b is the Production model on Cerebras's public free tier.
  // zai-glm-4.7 (Preview) is a fallback option.
  const modelName = 'gpt-oss-120b';
  
  // Define tools for Cerebras/OpenAI format (lowercase types, function wrapper)
  const tools = [
    {
      type: "function",
      function: {
        name: "get_fir_stats",
        description: "Retrieve FIR incident counts and breakdown for a specified district, optionally filtered by crime type and date range.",
        parameters: {
          type: "object",
          properties: {
            district: {
              type: "string",
              description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
            },
            crime_type: {
              type: "string",
              description: "Optional crime head category (e.g. Theft, Cybercrime, Narcotics & Excise, Violent Crimes, Financial Crimes)."
            },
            start_date: {
              type: "string",
              description: "Optional start date filter in YYYY-MM-DD format."
            },
            end_date: {
              type: "string",
              description: "Optional end date filter in YYYY-MM-DD format."
            }
          },
          required: ["district"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_district_risk_score",
        description: "Retrieve the current statistical and ARIMA-forecasted risk score for a specific district.",
        parameters: {
          type: "object",
          properties: {
            district: {
              type: "string",
              description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
            }
          },
          required: ["district"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_crime_trend",
        description: "Retrieve month-by-month historical crime incident trends for a district over a specified number of months.",
        parameters: {
          type: "object",
          properties: {
            district: {
              type: "string",
              description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
            },
            months: {
              type: "integer",
              description: "Optional number of historical months to retrieve trend data for (default is 12)."
            }
          },
          required: ["district"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "trace_accomplices",
        description: "Fetch the criminal network or accomplices registered under a specific FIR number.",
        parameters: {
          type: "object",
          properties: {
            fir_number: {
              type: "string",
              description: "The associated FIR number to trace (e.g., KA-BGU-2023-000002)."
            }
          },
          required: ["fir_number"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "file_fir",
        description: "Files a live FIR complaint and creates an optional suspect profile in the datastore.",
        parameters: {
          type: "object",
          properties: {
            district: {
              type: "string",
              description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
            },
            police_station: {
              type: "string",
              description: "Optional name of the police station."
            },
            crime_head: {
              type: "string",
              description: "Optional crime head category (e.g. Theft, Cybercrime, Narcotics & Excise, Violent Crimes, Financial Crimes)."
            },
            mo_description: {
              type: "string",
              description: "Narrative description of the crime's modus operandi."
            },
            offender_name: {
              type: "string",
              description: "Optional name of the offender/suspect."
            },
            age: {
              type: "integer",
              description: "Optional age of the suspect."
            },
            gender: {
              type: "string",
              description: "Optional gender of the suspect (MALE, FEMALE, TRANSGENDER)."
            }
          },
          required: ["district", "mo_description"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "fetch_intelligence_feed",
        description: "Search simulated live security advisories, current events, border patrol reports, and weather alerts in Karnataka.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Optional keyword or district name to filter security advisories."
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "web_search",
        description: "Perform a web search to retrieve current news, weather, or real-world events in Karnataka.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to look up."
            }
          },
          required: ["query"]
        }
      }
    }
  ];

  const coordinatorSystemInstruction = `You are the Ashen Copilot Coordinator.
Your role is to collect all relevant database statistics, risk scores, historical crime trends, and live context needed to answer the officer's query.
You must call the appropriate database tools or the web_search tool to gather this data.
Do NOT try to answer the query yourself or perform deep analytical reasoning. Your sole objective is to gather the facts using tools.
Once you have executed all relevant tools and collected the facts, summarize them clearly in a structured list of gathered facts, and end your response.`;

  let messages = [
    { role: 'system', content: coordinatorSystemInstruction },
    { role: 'user', content: userPrompt }
  ];

  const steps = [];
  let currentTurn = 0;
  const maxTurns = 5;
  const uniqueCitations = new Map(); // Maps URI -> Title

  while (currentTurn < maxTurns) {
    currentTurn++;
    console.log(`[Cerebras Coordinator] Loop iteration ${currentTurn}...`);

    const response = await client.chat.completions.create({
      model: modelName,
      messages: messages,
      tools: tools,
      tool_choice: 'auto'
    });

    const choice = response.choices[0];
    const message = choice.message;
    messages.push(message); // Keep history in sync

    const toolCalls = message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      steps.push({
        type: 'thought',
        content: `Coordinator decided to invoke tools: ${toolCalls.map(tc => tc.function.name).join(', ')}`
      });

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          toolArgs = parseArgs(toolCall.function.arguments);
        }

        steps.push({
          type: 'action',
          content: `Invoking tool ${toolName} with arguments: ${JSON.stringify(toolArgs)}`
        });

        let observation;
        try {
          if (toolName === 'web_search') {
            const query = toolArgs.query;
            const searchResult = await executeWebSearchTool(query);
            // Extract search citations if any
            if (searchResult && Array.isArray(searchResult.results)) {
              searchResult.results.forEach(r => {
                if (r.url) {
                  uniqueCitations.set(r.url, r.title || "Search Resource");
                }
              });
            }
            observation = searchResult;
          } else {
            const resultStr = await executeAgentTool(catalystApp, toolName, toolArgs, authOptions);
            let parsedResult;
            try {
              parsedResult = JSON.parse(resultStr);
              if (typeof parsedResult !== 'object' || parsedResult === null) {
                parsedResult = { result: resultStr };
              }
            } catch (e) {
              parsedResult = { result: resultStr };
            }
            observation = parsedResult;
          }
        } catch (err) {
          console.error(`[-] Error executing tool ${toolName}:`, err);
          observation = { error: `Failed to execute tool: ${err.message}` };
        }

        steps.push({
          type: 'observation',
          content: JSON.stringify(observation)
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(observation)
        });
      }

    } else {
      // Coordinator returned content without calling any tools
      const coordinatorSummary = message.content || "";
      console.log(`[Cerebras Coordinator summary of gathered facts]:\n`, coordinatorSummary);

      steps.push({
        type: 'thought',
        content: "Coordinator completed gathering facts. Proceeding to strategic reasoning synthesis..."
      });

      break;
    }
  }

  // Compile trace of tool queries
  let gatheredFactsText = "";
  steps.forEach(step => {
    if (step.type === 'action') {
      gatheredFactsText += `\n* **Tool Call:** ${step.content}`;
    } else if (step.type === 'observation') {
      gatheredFactsText += `\n  **Result:** ${step.content}`;
    }
  });

  // Compile search citations
  let searchMetadataText = "";
  if (uniqueCitations.size > 0) {
    searchMetadataText += "\n\n### Grounded Web Search Sources:\n";
    uniqueCitations.forEach((title, uri) => {
      searchMetadataText += `- [${title}](${uri})\n`;
    });
  }

  // Synthesize with Reasoner model (gpt-oss-120b on Cerebras)
  const reasonerSystemInstruction = `You are the Ashen Copilot Strategic Reasoner.
Your job is to synthesize a brief, executive-level Palantir Gotham intelligence report based on the officer's query and gathered facts.
CRITICAL FORMATTING RULES:
1. Keep the output CONCISE, HIGH-YIELD, and DIRECT (under 150-200 words). Avoid overwhelming boilerplates or long tables.
2. Structure your response clearly into 3 short sections:
   - **SUMMARY**: Quick overview with District, Period, Forecasted Count, and Risk Tier badge (🔴 HIGH / 🟡 MED / 🟢 LOW).
   - **KEY INSIGHTS & THREATS**: 2-3 short bullet points on trends and high-priority indicators.
   - **ACTIONABLE RECOMMENDATIONS**: 2 concise, clear steps for response.
3. Cite specific numbers from the datastore. If web sources are referenced, include clickable Markdown citations inline [Title](URL). Keep 'SOURCES & CITATIONS' brief at the end.`;

  const reasonerPrompt = `Officer's query: "${userPrompt}"

The Coordinator has gathered the following internal datastore records and external search results:

--- GATHERED FACTS ---
${gatheredFactsText}

${searchMetadataText}

Please synthesize your final strategic intelligence report now.`;

  console.log("[Cerebras Reasoner] Invoking gpt-oss-120b for final synthesis...");
  const reasonerResponse = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: reasonerSystemInstruction },
      { role: 'user', content: reasonerPrompt }
    ]
  });

  const reasonerText = reasonerResponse.choices[0].message.content;
  console.log("[Cerebras Reasoner Response Completed]");

  // Format citations list to append if not already present
  let finalCitationsSection = "";
  if (uniqueCitations.size > 0 && !reasonerText.toLowerCase().includes('sources & citations')) {
    finalCitationsSection += "\n\n### SOURCES & CITATIONS\n";
    uniqueCitations.forEach((title, uri) => {
      finalCitationsSection += `- [${title}](${uri})\n`;
    });
  }

  return {
    success: true,
    steps: steps,
    response: reasonerText + finalCitationsSection
  };
}

/**
 * Route Reasoning Agent calls based on the active provider setting.
 */
async function runReasoningAgent(catalystApp, userPrompt, authOptions) {
  const clean = userPrompt.trim().toLowerCase().replace(/[^\w\s]/g, '');
  const greetings = ['hi', 'hello', 'hey', 'heyy', 'greetings', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo', 'help'];
  
  if (greetings.includes(clean) || /^(who are you|what can you do|how does this work|what is this|explain copilot|how to use)/.test(clean)) {
    return {
      success: true,
      steps: [],
      response: `Hello Officer, I am the **Ashen Copilot** intelligence reasoning agent.

I am linked directly to the KSP crime analytics database and live intelligence feeds. How can I assist you today? You can ask me to:
- **Query incident stats**: *"How many theft cases are recorded in Mysuru?"*
- **Analyze trends & forecast risk**: *"What is the forecasted risk for Bengaluru Urban, and is it consistent with crime trends?"*
- **Trace criminal accomplice networks**: *"Trace accomplices for FIR KA-BGU-2023-000002."*
- **File a live complaint**: *"File a theft complaint in Mysuru with suspect named Ramesh, age 32."*
- **Search real-time intelligence feeds or current news**: *"Is there any ongoing infrastructure protest or weather issue in Outer Ring Road Bengaluru?"*

Please enter your operational query above.`
    };
  }

  const provider = process.env.LLM_PROVIDER || 'cerebras';
  if (provider === 'cerebras') {
    return await runCerebrasAgent(catalystApp, userPrompt, authOptions);
  } else {
    return await runGeminiAgent(catalystApp, userPrompt, authOptions);
  }
}

// GET /api/config
app.get('/api/config', (req, res) => {
  res.status(200).json({
    google_client_id: process.env.GOOGLE_CLIENT_ID || null
  });
});

// GET /api/debug/models
app.get('/api/debug/models', async (req, res) => {
  const https = require('https');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "No GEMINI_API_KEY in process.env" });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const request = https.request(url, options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.status(response.statusCode).json({
          statusCode: response.statusCode,
          apiKeyUsedPrefix: apiKey.substring(0, 15),
          response: parsed
        });
      } catch (e) {
        res.status(500).json({ error: "Failed to parse response", raw: data });
      }
    });
  });

  request.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });

  request.end();
});

// AI database query endpoint
// Shared handler for GET and POST query endpoints
async function handleQueryRequest(req, res, queryText, source = 'text') {
  try {
    const catalystApp = catalyst.initialize(req, { scope: 'admin' });
    const q = queryText || '';
    const queryLower = q.toLowerCase();

    // Read headers for Google OAuth token and Gemini API Key to avoid conflict with Catalyst SDK
    const oauthToken = req.headers['x-google-oauth-token'] || null;
    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    const hasApiKey = apiKey && apiKey !== 'your_key_here' && apiKey.trim() !== '';

    console.log(`[DEBUG] Incoming query (${source}): "${q}"`);
    console.log(`[DEBUG] Header x-gemini-api-key: "${req.headers['x-gemini-api-key'] ? 'PRESENT' : 'MISSING'}"`);
    console.log(`[DEBUG] Header x-google-oauth-token: "${req.headers['x-google-oauth-token'] ? 'PRESENT' : 'MISSING'}"`);
    console.log(`[DEBUG] process.env.GEMINI_API_KEY prefix: "${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 15) : 'UNDEFINED'}"`);
    console.log(`[DEBUG] Final apiKey prefix: "${apiKey ? apiKey.substring(0, 15) : 'UNDEFINED'}"`);

    const hasCerebras = LLM_PROVIDER === 'cerebras' && 
                        process.env.CEREBRAS_API_KEY && 
                        process.env.CEREBRAS_API_KEY.trim() !== '' && 
                        process.env.CEREBRAS_API_KEY !== 'your_cerebras_key_here';

    let fallbackReason = null;
    if (hasCerebras || oauthToken || hasApiKey) {
      try {
        const agentResult = await runReasoningAgent(catalystApp, q, { apiKey, oauthToken });
        return res.status(200).json(agentResult);
      } catch (agentErr) {
        console.error(`[-] ${LLM_PROVIDER === 'cerebras' ? 'Cerebras' : 'Gemini'} Agent error, falling back:`, agentErr);
        fallbackReason = agentErr.message;
      }
    }

    // Fallback prefix warning
    let warningPrefix = "";
    if (LLM_PROVIDER === 'cerebras') {
      if (!hasCerebras) {
        warningPrefix = "⚠️ **Cerebras Authentication missing**: Running in rule-based fallback mode. Please configure `CEREBRAS_API_KEY` in your `.env` file to activate the Reasoning Copilot.\n\n";
      } else if (fallbackReason) {
        warningPrefix = `⚠️ **Cerebras API Execution Failed** (Running in rule-based fallback mode):\n*Error details: "${fallbackReason}"*\n\nPlease check your Cerebras API key in settings or verify account status.\n\n`;
      }
    } else {
      warningPrefix = "⚠️ **Gemini Authentication missing**: Running in rule-based fallback mode. Please configure `GEMINI_API_KEY` in your `.env` file or sign in with Google in the chat panel to activate the Reasoning Copilot.\n\n";
      if (fallbackReason) {
        warningPrefix = `⚠️ **Gemini API Execution Failed** (Running in rule-based fallback mode):\n*Error details: "${fallbackReason}"*\n\nPlease check your Gemini API key in settings or verify Google Cloud Console project permissions.\n\n`;
      }
    }

    // AI Natural Language Filing Parser (Fallback)
    const checkFilingRequest = (text) => {
      const lower = text.toLowerCase();
      const keywords = ['file ', 'register ', 'inject ', 'report '];
      const isInjection = keywords.some(k => lower.includes(k)) && 
                          (lower.includes('fir') || lower.includes('complaint') || lower.includes('incident') || lower.includes('case'));
      if (!isInjection) return null;
      
      const data = {
        district: 'Bengaluru Urban',
        police_station: 'Central PS',
        crime_head: 'Theft',
        mo_description: text,
        offender_name: null,
        age: 30,
        gender: 'MALE'
      };
      
      if (lower.includes('bengaluru') || lower.includes('bangalore')) data.district = 'Bengaluru Urban';
      else if (lower.includes('mysuru') || lower.includes('mysore')) data.district = 'Mysuru';
      else if (lower.includes('hubballi') || lower.includes('dharwad') || lower.includes('hubli')) data.district = 'Hubballi-Dharwad';
      else if (lower.includes('mangaluru') || lower.includes('mangalore')) data.district = 'Mangaluru';
      else if (lower.includes('belagavi') || lower.includes('belgaum')) data.district = 'Belagavi';
      
      if (lower.includes('theft') || lower.includes('robbery') || lower.includes('burglary') || lower.includes('stolen') || lower.includes('dacoity')) {
        data.crime_head = 'Theft';
      } else if (lower.includes('cyber') || lower.includes('online') || lower.includes('phishing') || lower.includes('fraud') || lower.includes('cheat')) {
        data.crime_head = 'Cybercrime';
      } else if (lower.includes('narcotic') || lower.includes('drug') || lower.includes('ndps') || lower.includes('liquor')) {
        data.crime_head = 'Narcotics & Excise';
      } else if (lower.includes('murder') || lower.includes('violent') || lower.includes('assault') || lower.includes('homicide') || lower.includes('rape') || lower.includes('pocso')) {
        data.crime_head = 'Violent Crimes';
      } else if (lower.includes('financial') || lower.includes('forgery') || lower.includes('cheat') || lower.includes('money')) {
        data.crime_head = 'Financial Crimes';
      }

      const psMatch = text.match(/(?:at|in|near)\s+([a-zA-Z\s\-]+?)\s*(?:ps|police station|station)/i);
      if (psMatch) {
        data.police_station = psMatch[1].trim() + ' PS';
      }
      
      const nameMatch = text.match(/(?:suspect|offender|suspect name|suspect named|name|accused|accused named)\s*(?:is|:)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
      if (nameMatch) {
        data.offender_name = nameMatch[1].trim();
      }
      
      const ageMatch = text.match(/(?:age|aged)\s*(?:is|:)?\s*(\d+)/i) || text.match(/\b(\d+)\s*(?:years|years old|old)\b/i);
      if (ageMatch) {
        data.age = parseInt(ageMatch[1], 10);
      }
      
      const genderMatch = text.match(/(?:gender|sex)\s*(?:is|:)?\s*(male|female|transgender)/i) || text.match(/\b(male|female|transgender)\b/i);
      if (genderMatch) {
        data.gender = genderMatch[1].toUpperCase();
      }
      
      return data;
    };

    const filingData = checkFilingRequest(q);
    if (filingData) {
      const result = await injectFIRRecord(catalystApp, filingData);
      let responseMsg = `🚨 **Ashen Protocol AI Injection Successful**\n\n`;
      responseMsg += `A new FIR has been registered and written to the Catalyst Data Store:\n`;
      responseMsg += `* **FIR Number**: \`${result.firRow.fir_number}\`\n`;
      responseMsg += `* **District**: ${result.firRow.district}\n`;
      responseMsg += `* **Station**: ${result.firRow.police_station}\n`;
      responseMsg += `* **Offense Head**: ${result.firRow.crime_head}\n`;
      responseMsg += `* **MO Narrative**: *"${result.firRow.mo_description}"*\n`;
      responseMsg += `* **GIS Location**: Lat: \`${result.firRow.latitude}\`, Lon: \`${result.firRow.longitude}\`\n`;
      
      if (result.suspectInfo) {
        responseMsg += `\n**Associated Suspect Created:**\n`;
        responseMsg += `* **Suspect ID**: \`${result.suspectInfo.offender_id}\`\n`;
        responseMsg += `* **Name**: ${result.suspectInfo.offender_name} | Age: ${result.suspectInfo.age} | Sex: ${result.suspectInfo.gender}\n`;
        responseMsg += `* **Calculated Recidivism Risk**: \`${result.suspectInfo.base_risk_score}%\`\n`;
      }
      
      return res.json({ response: warningPrefix + responseMsg });
    }

    // 1. Detect District
    let district = null;
    if (queryLower.includes('bengaluru') || queryLower.includes('bangalore')) {
      district = 'Bengaluru Urban';
    } else if (queryLower.includes('mysuru') || queryLower.includes('mysore')) {
      district = 'Mysuru';
    } else if (queryLower.includes('hubballi') || queryLower.includes('dharwad') || queryLower.includes('hubli')) {
      district = 'Hubballi-Dharwad';
    } else if (queryLower.includes('mangaluru') || queryLower.includes('mangalore')) {
      district = 'Mangaluru';
    } else if (queryLower.includes('belagavi') || queryLower.includes('belgaum')) {
      district = 'Belagavi';
    }

    // 2. Detect Crime Category & keywords
    let crimeKeyword = null;
    let crimeLabel = '';
    if (queryLower.includes('theft') || queryLower.includes('robbery') || queryLower.includes('burglary') || queryLower.includes('stolen') || queryLower.includes('dacoity') || queryLower.includes('extortion')) {
      crimeKeyword = 'theft';
      crimeLabel = 'Theft & Property';
    } else if (queryLower.includes('cyber') || queryLower.includes('online') || queryLower.includes('phishing') || queryLower.includes('internet') || queryLower.includes('computer')) {
      crimeKeyword = 'cyber';
      crimeLabel = 'Cybercrime';
    } else if (queryLower.includes('narcotic') || queryLower.includes('drug') || queryLower.includes('ndps') || queryLower.includes('liquor') || queryLower.includes('alcohol') || queryLower.includes('excise')) {
      crimeKeyword = 'narcotic';
      crimeLabel = 'Narcotics & Excise';
    } else if (queryLower.includes('murder') || queryLower.includes('violent') || queryLower.includes('assault') || queryLower.includes('homicide') || queryLower.includes('death') || queryLower.includes('rape') || queryLower.includes('pocso')) {
      crimeKeyword = 'murder';
      crimeLabel = 'Violent Crimes';
    } else if (queryLower.includes('cheat') || queryLower.includes('fraud') || queryLower.includes('financial') || queryLower.includes('forgery') || queryLower.includes('money')) {
      crimeKeyword = 'cheat';
      crimeLabel = 'Financial Crimes';
    }

    // 3. Detect Suspect search
    let suspectName = null;
    const suspectKeywords = ['find', 'search', 'who is', 'suspect', 'offender', 'look up'];
    for (const kw of suspectKeywords) {
      if (queryLower.includes(kw)) {
        const idx = queryLower.indexOf(kw);
        let rawName = q.substring(idx + kw.length).trim();
        // Remove auxiliary words from the beginning of the name (e.g. "suspect John" -> "John")
        rawName = rawName.replace(/^(?:suspect|offender|accused|name|is|:)\s+/i, '').trim();
        const cleaned = rawName.replace(/[^a-zA-Z\s]/g, '').trim();
        if (cleaned.length > 2) {
          suspectName = cleaned;
          break;
        }
      }
    }

    if (suspectName) {
      const escapedName = suspectName.replace(/'/g, "''");
      const query = `SELECT offender_id, offender_name, age, gender, base_risk_score, associated_fir_number FROM Offenders WHERE offender_name LIKE '%${escapedName}%' LIMIT 3`;
      const queryResult = await catalystApp.zcql().executeZCQLQuery(query);
      const results = flattenResults(queryResult);
      
      if (results.length === 0) {
        return res.json({
          response: warningPrefix + `No offenders matching "${suspectName}" were found in the active KSP database.`
        });
      }

      let responseText = warningPrefix + `Database search returned ${results.length} suspect profile(s) matching "${suspectName}":\n\n`;
      results.forEach((sus, index) => {
        responseText += `${index + 1}. Name: ${sus.offender_name} (ID: \`${sus.offender_id}\`) | Age: ${sus.age} | Gender: ${sus.gender}\n`;
        responseText += `   Base Risk: ${parseFloat(sus.base_risk_score).toFixed(2)} | Associated FIR: ${sus.associated_fir_number}\n\n`;
      });
      return res.json({ response: responseText });
    }

    // 4. Run Count queries if matching district or crime category
    if (district && crimeKeyword) {
      const escDistrict = district.replace(/'/g, "''");
      const query = `SELECT COUNT(fir_number) FROM FIR_Records WHERE district = '${escDistrict}' AND (crime_head LIKE '%${crimeKeyword}%' OR crime_head LIKE '%${crimeLabel.split(' ')[0]}%')`;
      const queryResult = await catalystApp.zcql().executeZCQLQuery(query);
      const count = parseInt(flattenResults(queryResult)[0]['COUNT(fir_number)']) || 0;
      return res.json({
        response: warningPrefix + `KSP intelligence records indicate exactly ${count.toLocaleString('en-IN')} cases of ${crimeLabel} in the district of ${district}.`
      });
    } else if (district) {
      const escDistrict = district.replace(/'/g, "''");
      const query = `SELECT COUNT(fir_number) FROM FIR_Records WHERE district = '${escDistrict}'`;
      const queryResult = await catalystApp.zcql().executeZCQLQuery(query);
      const count = parseInt(flattenResults(queryResult)[0]['COUNT(fir_number)']) || 0;
      return res.json({
        response: warningPrefix + `Total incident cases registered in ${district} district is ${count.toLocaleString('en-IN')}.`
      });
    } else if (crimeKeyword) {
      const query = `SELECT COUNT(fir_number) FROM FIR_Records WHERE crime_head LIKE '%${crimeKeyword}%' OR crime_head LIKE '%${crimeLabel.split(' ')[0]}%'`;
      const queryResult = await catalystApp.zcql().executeZCQLQuery(query);
      const count = parseInt(flattenResults(queryResult)[0]['COUNT(fir_number)']) || 0;
      return res.json({
        response: warningPrefix + `Found ${count.toLocaleString('en-IN')} cases of ${crimeLabel} recorded statewide across all districts.`
      });
    }

    return res.json({
      response: warningPrefix + `Query processed. I am the Ashen AI Query Agent linked to the KSP database. You can ask me for data-driven analytics:\n- "How many theft cases in Mysuru?"\n- "Find suspect John"\n- "Show cybercrime cases"\n- "Total incidents in Hubballi-Dharwad"`
    });

  } catch (err) {
    console.error("Chat Query Error:", err);
    return res.status(500).json({ error: "Query failed", details: err.message });
  }
}

// AI database query endpoint (GET)
app.get('/api/chat/query', async (req, res) => {
  await handleQueryRequest(req, res, req.query.q, 'text');
});

// AI database query endpoint (POST for voice/copilot integration)
app.post('/api/copilot/query', async (req, res) => {
  await handleQueryRequest(req, res, req.body.query, req.body.source || 'voice');
});

// Universal SPA fallback middleware for non-API GET requests (eliminates "Cannot GET /app/" forever)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.url.startsWith('/api') && fs.existsSync(path.join(clientDir, 'index.html'))) {
    return res.sendFile(path.join(clientDir, 'index.html'));
  }
  next();
});

// Server listener configuration
const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[+] Server started and listening on http://localhost:${port}`);
});


module.exports = app;
