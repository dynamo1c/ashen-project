const fs = require('fs');
const path = require('path');

const repo = __dirname;

const dirs = [
  path.join(repo, 'docs'),
  path.join(repo, 'docs', 'archive'),
  path.join(repo, 'docs', 'media'),
  path.join(repo, 'scripts', 'data_pipeline'),
  path.join(repo, 'scripts', 'utils'),
  path.join(repo, 'data', 'seeds')
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    console.log(`Created dir: ${d}`);
  }
});

const toDelete = [
  path.join(repo, 'palantir_foundry_mapping updated.md'),
  path.join(repo, 'triage_and_clean.py'),
  path.join(repo, 'test.py'),
  path.join(repo, 'read_log_ws.py'),
  path.join(repo, 'Import_44908000000019007_16186190944700.zip'),
  path.join(repo, 'Import_44908000000019009_16438598021100.zip'),
  path.join(repo, 'Import_44908000000101001_16325326532200.zip'),
  path.join(repo, 'reorganize_temp.py')
];

toDelete.forEach(f => {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log(`Deleted: ${f}`);
  }
});

const moves = [
  ['ASHEN_PROTOCOL.md', 'docs/ASHEN_PROTOCOL.md'],
  ['DESIGN.md', 'docs/DESIGN.md'],
  ['codebase_audit.md', 'docs/codebase_audit.md'],
  ['palantir_foundry_mapping.md', 'docs/palantir_foundry_mapping.md'],
  ['karnataka_police_stations.md', 'docs/karnataka_police_stations.md'],
  ['ASHEN_PROTOCOL_ML_SESSION_LOG.md', 'docs/archive/ASHEN_PROTOCOL_ML_SESSION_LOG.md'],
  ['2026-07-25 11-01-18.mp4', 'docs/media/2026-07-25 11-01-18.mp4'],

  ['git_push_local.py', 'scripts/utils/git_push_local.py'],
  ['read_history.py', 'scripts/utils/read_history.py'],
  ['read_history.js', 'scripts/utils/read_history.js'],
  ['read_routes.js', 'scripts/utils/read_routes.js'],
  ['test_gemini.js', 'scripts/utils/test_gemini.js'],
  ['verify_fix.js', 'scripts/utils/verify_fix.js'],
  ['run_test.bat', 'scripts/utils/run_test.bat'],
  ['functions/ashen_api/test_api_key.js', 'scripts/utils/test_api_key.js'],
  ['functions/ashen_api/test_query.js', 'scripts/utils/test_query.js'],
  ['functions/ashen_api/integrate_forecasts.js', 'scripts/utils/integrate_forecasts.js'],

  ['generate_firs.py', 'scripts/data_pipeline/generate_firs.py'],
  ['aggregate_monthly.py', 'scripts/data_pipeline/aggregate_monthly.py'],
  ['inject_timeseries_patterns.py', 'scripts/data_pipeline/inject_timeseries_patterns.py'],
  ['prepare_pipeline_datasets.py', 'scripts/data_pipeline/prepare_pipeline_datasets.py'],
  ['backfill_offenders.py', 'scripts/data_pipeline/backfill_offenders.py'],
  ['verify_data.py', 'scripts/data_pipeline/verify_data.py'],

  ['fir_records_seed.csv', 'data/seeds/fir_records_seed.csv'],
  ['offenders_seed.csv', 'data/seeds/offenders_seed.csv'],
  ['district_risk_scores_seed.csv', 'data/seeds/district_risk_scores_seed.csv'],
  ['district_monthly_incidents.csv', 'data/seeds/district_monthly_incidents.csv'],
  ['district_monthly_incidents_v2.csv', 'data/seeds/district_monthly_incidents_v2.csv']
];

moves.forEach(([srcRel, dstRel]) => {
  const src = path.join(repo, srcRel);
  const dst = path.join(repo, dstRel);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dst);
    console.log(`Moved ${srcRel} -> ${dstRel}`);
  } else {
    console.log(`Source not found: ${srcRel}`);
  }
});
