import os
import pandas as pd
import numpy as np

def main():
    print("==================================================")
    print("ASHEN PROTOCOL SYNTHETIC DATA VALIDATION CHECK")
    print("==================================================")

    # File paths
    fir_file = 'fir_records_seed.csv'
    offender_file = 'offenders_seed.csv'
    drs_file = 'district_risk_scores_seed.csv'

    # Check file existence
    for f in [fir_file, offender_file, drs_file]:
        if not os.path.exists(f):
            print(f"[-] ERROR: File '{f}' is missing. Please run 'python generate_firs.py' first.")
            return

    # Load data
    print("[+] Loading files...")
    fir_df = pd.read_csv(fir_file)
    off_df = pd.read_csv(offender_file)
    drs_df = pd.read_csv(drs_file)

    # 1. Row counts validation
    print(f"\n[1] Row Counts:")
    print(f"  * FIR Records count: {len(fir_df)}")
    if len(fir_df) == 75000:
        print("  [PASS] FIR Records table has exactly 75,000 rows.")
    else:
        print(f"  [FAIL] Expected 75,000, got {len(fir_df)}.")

    print(f"  * Offenders count: {len(off_df)}")
    print(f"  * District Risk Scores count: {len(drs_df)}")

    # 2. Coordinates bounding box validation
    print(f"\n[2] Geospatial Boundaries:")
    min_lat, max_lat = fir_df['latitude'].min(), fir_df['latitude'].max()
    min_lon, max_lon = fir_df['longitude'].min(), fir_df['longitude'].max()
    print(f"  * Latitude range: {min_lat}°N to {max_lat}°N")
    print(f"  * Longitude range: {min_lon}°E to {max_lon}°E")
    
    in_bounds = (min_lat >= 11.5) and (max_lat <= 18.5) and (min_lon >= 74.0) and (max_lon <= 78.5)
    if in_bounds:
        print("  [PASS] All coordinates fall strictly within Karnataka boundaries (11.5-18.5 N, 74.0-78.5 E).")
    else:
        print("  [FAIL] Some coordinates fall outside boundaries.")

    # 3. Primary Key Uniqueness
    print(f"\n[3] Primary Key Uniqueness:")
    fir_pk_unique = fir_df['fir_number'].is_unique
    # Composite key check: offender_id + associated_fir_number
    off_composite_series = off_df['offender_id'] + "_" + off_df['associated_fir_number']
    off_pk_unique = off_composite_series.is_unique
    drs_pk_unique = drs_df['record_id'].is_unique

    if fir_pk_unique:
        print("  [PASS] FIR_Records.fir_number is unique (PK).")
    else:
        print("  [FAIL] FIR_Records.fir_number has duplicates.")

    if off_pk_unique:
        print("  [PASS] Offenders (offender_id + associated_fir_number) composite link key is unique.")
    else:
        print("  [FAIL] Offenders composite link key has duplicates.")

    if drs_pk_unique:
        print("  [PASS] District_Risk_Scores.record_id is unique (PK).")
    else:
        print("  [FAIL] District_Risk_Scores.record_id has duplicates.")

    # 4. Co-Offender linkages (gangs)
    print(f"\n[4] Network Connection Checks:")
    fir_counts_in_off = off_df['associated_fir_number'].value_counts()
    multi_offender_firs = (fir_counts_in_off > 1).sum()
    total_firs_in_off = len(fir_counts_in_off)
    multi_offender_pct = (multi_offender_firs / total_firs_in_off) * 100
    print(f"  * Number of FIRs linked to multiple suspects: {multi_offender_firs} / {total_firs_in_off} ({multi_offender_pct:.2f}%)")
    
    if 18.0 <= multi_offender_pct <= 22.0:
        print("  [PASS] Co-offending rate is roughly 20% (simulating gang networks).")
    else:
        print("  [FAIL] Co-offending rate deviates from 20%.")

    # 5. Repeat offenders (recidivism)
    id_counts = off_df['offender_id'].value_counts()
    repeat_offenders = (id_counts > 1).sum()
    print(f"  * Number of repeat offenders (recidivists): {repeat_offenders}")
    if repeat_offenders > 0:
        print("  [PASS] Recidivism is present to allow network graph connectivity.")
    else:
        print("  [FAIL] No repeat offenders found; network graph will be disconnected.")

    # 6. Null checks
    print(f"\n[6] Data Quality & Null Integrity Check:")
    fir_nulls = fir_df.isnull().sum().sum()
    off_nulls = off_df.isnull().sum().sum()
    drs_nulls = drs_df.isnull().sum().sum()
    
    if fir_nulls == 0 and off_nulls == 0 and drs_nulls == 0:
        print("  [PASS] Zero null values across all tables.")
    else:
        print(f"  [FAIL] Found null values: FIR ({fir_nulls}), Offenders ({off_nulls}), DRS ({drs_nulls}).")

    # 7. Distribution summary
    print(f"\n[7] Target District Incident Distribution:")
    for dist, count in fir_df['district'].value_counts().items():
        print(f"  * {dist}: {count} ({count/len(fir_df):.2%})")

    print(f"\n[8] Risk Score Levels (District Risk Scores):")
    for lvl, count in drs_df['predicted_risk_level'].value_counts().items():
        print(f"  * {lvl}: {count} ({count/len(drs_df):.2%})")

    print("\n==================================================")
    print("VALIDATION SUMMARY COMPLETE")
    print("==================================================")

if __name__ == '__main__':
    main()
