const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..', '..');
const importsDir = path.join(repo, 'data', 'imports');

// Ensure data/imports directory exists
if (!fs.existsSync(importsDir)) {
  fs.mkdirSync(importsDir, { recursive: true });
}

// Zip dumps to move to data/imports/ for provenance
const zipFiles = [
  'Import_44908000000019007_16186190944700.zip',
  'Import_44908000000019009_16438598021100.zip',
  'Import_44908000000101001_16325326532200.zip'
];

zipFiles.forEach(file => {
  const src = path.join(repo, file);
  const dest = path.join(importsDir, file);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`[PROVENANCE] Moved zip log ${file} -> data/imports/`);
  }
});

// Relocated/obsolete root files to remove
const rootFilesToDelete = [
  'palantir_foundry_mapping updated.md',
  'triage_and_clean.py',
  'test.py',
  'read_log_ws.py',
  'reorganize_temp.js',
  'reorganize_temp.py',
  'ASHEN_PROTOCOL.md',
  'DESIGN.md',
  'codebase_audit.md',
  'palantir_foundry_mapping.md',
  'karnataka_police_stations.md',
  'ASHEN_PROTOCOL_ML_SESSION_LOG.md',
  '2026-07-25 11-01-18.mp4',
  'git_push_local.py',
  'read_history.py',
  'read_history.js',
  'read_routes.js',
  'test_gemini.js',
  'verify_fix.js',
  'run_test.bat',
  'generate_firs.py',
  'aggregate_monthly.py',
  'inject_timeseries_patterns.py',
  'prepare_pipeline_datasets.py',
  'backfill_offenders.py',
  'verify_data.py',
  'fir_records_seed.csv',
  'offenders_seed.csv',
  'district_risk_scores_seed.csv',
  'district_monthly_incidents.csv',
  'district_monthly_incidents_v2.csv',
  'catalyst-debug.log'
];

let count = 0;
rootFilesToDelete.forEach(file => {
  const fullPath = path.join(repo, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`[CLEANUP] Removed root file: ${file}`);
    count++;
  }
});

console.log(`[SUCCESS] Root cleanup complete. Removed ${count} redundant files from repo root.`);
