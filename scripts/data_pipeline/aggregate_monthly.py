import os
import sys
import pandas as pd

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def main():
    print("==================================================")
    # File paths
    csv_path = os.path.join(ROOT_DIR, 'data', 'seeds', 'fir_records_seed.csv')
    output_path = os.path.join(ROOT_DIR, 'data', 'seeds', 'district_monthly_incidents.csv')
    
    if not os.path.exists(csv_path):
        print(f"[-] ERROR: Raw seed file '{csv_path}' not found.")
        sys.exit(1)
        
    print(f"[+] Loading raw incidents from '{csv_path}'...")
    # Read CSV, projecting only the columns we need to save memory
    df = pd.read_csv(csv_path, usecols=['district', 'incident_timestamp'])
    
    print("[+] Inspecting and parsing timestamps...")
    # Identify nulls
    null_timestamps = df['incident_timestamp'].isnull().sum()
    if null_timestamps > 0:
        print(f"[!] WARNING: Found {null_timestamps} rows with missing (null) timestamps.")
        
    # Parse dates with coercion to catch formatting errors
    df['parsed_time'] = pd.to_datetime(df['incident_timestamp'], format='%Y-%m-%d %H:%M:%S', errors='coerce')
    
    # Identify parsing failures
    unparsed_count = df['parsed_time'].isnull().sum() - null_timestamps
    if unparsed_count > 0:
        print(f"[!] WARNING: Found {unparsed_count} malformed timestamps that failed date parsing.")
        # Display sample invalid values
        sample_failures = df[df['parsed_time'].isnull() & df['incident_timestamp'].notnull()]['incident_timestamp'].head()
        print("    Sample malformed timestamps:")
        for val in sample_failures:
            print(f"      - {val}")
            
    # Drop records with invalid or missing timestamps
    clean_df = df.dropna(subset=['parsed_time']).copy()
    
    # Format year_month as YYYY-MM-01 (Month Start date format)
    clean_df['year_month'] = clean_df['parsed_time'].dt.strftime('%Y-%m-01')
    
    # Determine date range
    min_date = clean_df['parsed_time'].min()
    max_date = clean_df['parsed_time'].max()
    print(f"[+] Date range in seed: {min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}")
    
    # Extract unique districts and complete range of months
    districts = clean_df['district'].unique()
    months = pd.date_range(start=min_date.replace(day=1), end=max_date.replace(day=1), freq='MS').strftime('%Y-%m-01')
    
    print(f"[+] Unique districts found ({len(districts)}): {list(districts)}")
    print(f"[+] Complete month timeline contains {len(months)} months.")
    
    # Group and count incidents
    print("[+] Performing aggregation...")
    grouped = clean_df.groupby(['district', 'year_month']).size().reset_index(name='incident_count')
    
    # Build complete grid (district x month) to ensure zero gaps
    print("[+] Reindexing grid to fill time-series gaps with 0...")
    grid_index = pd.MultiIndex.from_product([districts, months], names=['district', 'year_month'])
    aligned_df = grouped.set_index(['district', 'year_month']).reindex(grid_index, fill_value=0).reset_index()
    
    # Sort chronologically (ascending by district and year_month)
    aligned_df = aligned_df.sort_values(by=['district', 'year_month']).reset_index(drop=True)
    
    # Save output
    aligned_df.to_csv(output_path, index=False)
    print(f"[+] Exported aggregate time-series file: '{output_path}'")
    
    # Summary & Sanity Verification checks
    total_rows = len(aligned_df)
    expected_rows = len(districts) * len(months)
    
    print("\n================== SUMMARY REPORT ==================")
    print(f"Total Districts  : {len(districts)}")
    print(f"Earliest Month   : {months[0]}")
    print(f"Latest Month     : {months[-1]}")
    print(f"Total Months     : {len(months)}")
    print(f"Output Rows      : {total_rows} (Expected: {expected_rows})")
    
    # Sanity checks
    if total_rows == expected_rows:
        print("[PASS] Time-series grid is complete and symmetrical (Districts * Months = Rows).")
    else:
        print("[FAIL] Symmetrical grid mismatch!")
        
    gaps_detected = 0
    for dist in districts:
        dist_count = len(aligned_df[aligned_df['district'] == dist])
        if dist_count != len(months):
            print(f"[FAIL] District '{dist}' has {dist_count} months instead of {len(months)}.")
            gaps_detected += 1
            
    if gaps_detected == 0:
        print("[PASS] All districts have exactly one row per month with zero missing periods.")
    else:
        print(f"[FAIL] Found {gaps_detected} districts with missing monthly periods.")
        
    print("====================================================")

if __name__ == '__main__':
    main()
