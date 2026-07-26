import os
import shutil

repo = os.path.dirname(os.path.abspath(__file__))

dirs = [
    os.path.join(repo, "docs"),
    os.path.join(repo, "docs", "archive"),
    os.path.join(repo, "docs", "media"),
    os.path.join(repo, "scripts", "data_pipeline"),
    os.path.join(repo, "scripts", "utils"),
    os.path.join(repo, "data", "seeds"),
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    print(f"Created dir: {d}")

# Deletions
to_delete = [
    os.path.join(repo, "palantir_foundry_mapping updated.md"),
    os.path.join(repo, "triage_and_clean.py"),
    os.path.join(repo, "test.py"),
    os.path.join(repo, "read_log_ws.py"),
    os.path.join(repo, "Import_44908000000019007_16186190944700.zip"),
    os.path.join(repo, "Import_44908000000019009_16438598021100.zip"),
    os.path.join(repo, "Import_44908000000101001_16325326532200.zip"),
]

for f in to_delete:
    if os.path.exists(f):
        os.remove(f)
        print(f"Deleted: {f}")

# Moves
moves = [
    # Docs
    ("ASHEN_PROTOCOL.md", "docs/ASHEN_PROTOCOL.md"),
    ("DESIGN.md", "docs/DESIGN.md"),
    ("codebase_audit.md", "docs/codebase_audit.md"),
    ("palantir_foundry_mapping.md", "docs/palantir_foundry_mapping.md"),
    ("karnataka_police_stations.md", "docs/karnataka_police_stations.md"),
    ("ASHEN_PROTOCOL_ML_SESSION_LOG.md", "docs/archive/ASHEN_PROTOCOL_ML_SESSION_LOG.md"),
    ("2026-07-25 11-01-18.mp4", "docs/media/2026-07-25 11-01-18.mp4"),
    # Utils
    ("git_push_local.py", "scripts/utils/git_push_local.py"),
    ("read_history.py", "scripts/utils/read_history.py"),
    ("read_history.js", "scripts/utils/read_history.js"),
    ("read_routes.js", "scripts/utils/read_routes.js"),
    ("test_gemini.js", "scripts/utils/test_gemini.js"),
    ("verify_fix.js", "scripts/utils/verify_fix.js"),
    ("run_test.bat", "scripts/utils/run_test.bat"),
    ("functions/ashen_api/test_api_key.js", "scripts/utils/test_api_key.js"),
    ("functions/ashen_api/test_query.js", "scripts/utils/test_query.js"),
    ("functions/ashen_api/integrate_forecasts.js", "scripts/utils/integrate_forecasts.js"),
    # Pipeline
    ("generate_firs.py", "scripts/data_pipeline/generate_firs.py"),
    ("aggregate_monthly.py", "scripts/data_pipeline/aggregate_monthly.py"),
    ("inject_timeseries_patterns.py", "scripts/data_pipeline/inject_timeseries_patterns.py"),
    ("prepare_pipeline_datasets.py", "scripts/data_pipeline/prepare_pipeline_datasets.py"),
    ("backfill_offenders.py", "scripts/data_pipeline/backfill_offenders.py"),
    ("verify_data.py", "scripts/data_pipeline/verify_data.py"),
    # Seeds
    ("fir_records_seed.csv", "data/seeds/fir_records_seed.csv"),
    ("offenders_seed.csv", "data/seeds/offenders_seed.csv"),
    ("district_risk_scores_seed.csv", "data/seeds/district_risk_scores_seed.csv"),
    ("district_monthly_incidents.csv", "data/seeds/district_monthly_incidents.csv"),
    ("district_monthly_incidents_v2.csv", "data/seeds/district_monthly_incidents_v2.csv"),
]

for src_rel, dst_rel in moves:
    src = os.path.join(repo, src_rel)
    dst = os.path.join(repo, dst_rel)
    if os.path.exists(src):
        shutil.move(src, dst)
        print(f"Moved {src_rel} -> {dst_rel}")
    else:
        print(f"Source not found: {src_rel}")
