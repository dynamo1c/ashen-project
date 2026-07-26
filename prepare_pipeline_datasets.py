import os
import sys
import numpy as np
import pandas as pd

def main():
    print("==================================================")
    print("ASHEN PROTOCOL - QUICKML DATASET PREPARATION")
    print("==================================================")
    
    input_path = 'district_monthly_incidents_v2.csv'
    raw_dir = os.path.join('forecast_data', 'raw')
    smoothed_dir = os.path.join('forecast_data', 'smoothed')
    
    if not os.path.exists(input_path):
        print(f"[-] ERROR: Script baseline '{input_path}' not found. Please run inject_timeseries_patterns.py first.")
        sys.exit(1)
        
    # Create directories if they don't exist
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(smoothed_dir, exist_ok=True)
    
    print(f"[+] Output directories established: '{raw_dir}' and '{smoothed_dir}'")
    
    # Load v2 structured time-series data
    df = pd.read_csv(input_path)
    districts = sorted(df['district'].unique())
    
    # Hardcoded known injected anomalies for validation comparison
    known_anomalies = {
        'Belagavi': ['2023-12-01', '2025-01-01'],
        'Bengaluru Urban': ['2023-11-01', '2025-05-01'],
        'Hubballi-Dharwad': ['2024-03-01', '2025-09-01'],
        'Mangaluru': ['2023-07-01'],
        'Mysuru': ['2024-10-01']
    }
    
    # Track smoothing operations
    detected_anomalies = []
    smoothing_counts = {}
    
    # Threshold description:
    # We choose a percentage deviation threshold of 25% (0.25) relative to local rolling expectation.
    # Justification:
    # 1. It is large enough to avoid false positives from expected seasonal swings (which peak at +12% and trough at -10%).
    # 2. It is sensitive enough to capture all injected anomalies, which are >= 30% in magnitude (from -35% to +80%).
    THRESHOLD = 0.25
    WINDOW_RADIUS = 2 # centered window of size 5 (i-2, i-1, i+1, i+2) excluding index i itself
    
    print(f"[+] Processing {len(districts)} districts...")
    
    for district in districts:
        # Sanitize name for filesystem safety (e.g. "Hubballi-Dharwad" -> "hubballi_dharwad")
        fs_name = district.lower().replace(' ', '_').replace('-', '_')
        
        # 1. Filter to district data and sort chronologically
        dist_df = df[df['district'] == district].sort_values('year_month').reset_index(drop=True)
        
        # Save RAW dataset (for Anomaly Detection QuickML pipeline)
        # Univariate Forecasting / Anomaly detection pipelines require (timestamp, target) columns only
        raw_df = dist_df[['year_month', 'incident_count']].copy()
        raw_file_path = os.path.join(raw_dir, f"{fs_name}_raw.csv")
        raw_df.to_csv(raw_file_path, index=False)
        
        # 2. Perform Outlier Detection and Interpolation (for Univariate Forecasting pipeline)
        smoothed_series = dist_df['incident_count'].copy().astype(float)
        flagged_indices = []
        
        n = len(dist_df)
        for i in range(n):
            actual = dist_df.loc[i, 'incident_count']
            date_str = dist_df.loc[i, 'year_month']
            
            # Extract neighborhood indices excluding current index i
            neighbor_indices = [
                i + offset for offset in range(-WINDOW_RADIUS, WINDOW_RADIUS + 1)
                if offset != 0 and 0 <= i + offset < n
            ]
            
            # Local rolling expectation (centered median)
            local_vals = [dist_df.loc[j, 'incident_count'] for j in neighbor_indices]
            local_expectation = np.median(local_vals)
            
            # Compute relative deviation
            # NOTE: For low-baseline districts (if any existed below 50 incidents), a raw percentage check
            # might trigger on minor random fluctuations. However, all our districts have baselines >= 200,
            # so a flat percentage threshold works stably across all series.
            deviation = abs(actual - local_expectation) / local_expectation
            
            if deviation > THRESHOLD:
                flagged_indices.append(i)
                detected_anomalies.append({
                    'district': district,
                    'year_month': date_str,
                    'original': actual,
                    'expectation': local_expectation,
                    'deviation': deviation
                })
                
        # Apply smoothing: Set flagged points to NaN and linearly interpolate
        temp_series = dist_df['incident_count'].copy().astype(float)
        for idx in flagged_indices:
            temp_series.loc[idx] = np.nan
            
        # Linear interpolation
        temp_series = temp_series.interpolate(method='linear')
        # Fallback forward/backward fill for boundary points if they were flagged
        temp_series = temp_series.bfill().ffill()
        # Round back to integers
        smoothed_series = temp_series.round().astype(int)
        
        # Log replacements and save smoothed CSV
        smoothed_df = pd.DataFrame({
            'year_month': dist_df['year_month'],
            'incident_count': smoothed_series
        })
        
        smoothed_file_path = os.path.join(smoothed_dir, f"{fs_name}_smoothed.csv")
        smoothed_df.to_csv(smoothed_file_path, index=False)
        
        smoothing_counts[district] = len(flagged_indices)
        
        # Output detailed changes log
        if len(flagged_indices) > 0:
            print(f"  * {district}: Flagged and smoothed {len(flagged_indices)} points:")
            for idx in flagged_indices:
                orig = dist_df.loc[idx, 'incident_count']
                new_val = smoothed_series.loc[idx]
                print(f"    - {dist_df.loc[idx, 'year_month']}: {orig} -> {new_val} (interpolated)")
        else:
            print(f"  * {district}: No outliers flagged.")
            
    # 3. Validation safeguard comparison
    print("\n================ VALIDATION SAFEGUARD CHECK ================")
    print(f"{'District':<18} | {'Month':<12} | {'Status':<10} | {'Original':<8} | {'Smoothed':<8}")
    print("-" * 65)
    
    detected_keys = {(item['district'], item['year_month']) for item in detected_anomalies}
    
    total_injected = 0
    total_detected = 0
    
    for dist, dates_list in known_anomalies.items():
        # Load output smoothed dataframe for comparison
        fs_name = dist.lower().replace(' ', '_').replace('-', '_')
        dist_raw = pd.read_csv(os.path.join(raw_dir, f"{fs_name}_raw.csv")).set_index('year_month')
        dist_smooth = pd.read_csv(os.path.join(smoothed_dir, f"{fs_name}_smoothed.csv")).set_index('year_month')
        
        for dt in dates_list:
            total_injected += 1
            is_detected = (dist, dt) in detected_keys
            status = "DETECTED" if is_detected else "MISSED"
            if is_detected:
                total_detected += 1
                
            orig_val = dist_raw.loc[dt, 'incident_count']
            smooth_val = dist_smooth.loc[dt, 'incident_count']
            print(f"{dist:<18} | {dt:<12} | {status:<10} | {orig_val:<8} | {smooth_val:<8}")
            
    print("-" * 65)
    detection_rate = (total_detected / total_injected) * 100
    print(f"Result: Detected and smoothed {total_detected} / {total_injected} injected anomalies ({detection_rate:.1f}%).")
    
    # 4. Generate final counts summary
    raw_files = len(os.listdir(raw_dir))
    smooth_files = len(os.listdir(smoothed_dir))
    
    print("\n==================== DATASET SUMMARY ====================")
    print(f"Raw Files Created      : {raw_files} (Target: 5)")
    print(f"Smoothed Files Created : {smooth_files} (Target: 5)")
    print("Files created per district:")
    for dist in districts:
        fs_name = dist.lower().replace(' ', '_').replace('-', '_')
        print(f"  * {dist:<18} -> raw: {fs_name}_raw.csv | smoothed: {fs_name}_smoothed.csv ({smoothing_counts[dist]} points adjusted)")
        
    print("=========================================================")

if __name__ == '__main__':
    main()
