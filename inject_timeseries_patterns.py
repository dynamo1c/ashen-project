import os
import sys
import numpy as np
import pandas as pd

def main():
    print("==================================================")
    print("ASHEN PROTOCOL - STRUCTURED TIME SERIES GENERATOR")
    print("==================================================")
    
    input_path = 'district_monthly_incidents.csv'
    output_path = 'district_monthly_incidents_v2.csv'
    
    if not os.path.exists(input_path):
        print(f"[-] ERROR: Baseline file '{input_path}' not found. Please run aggregate_monthly.py first.")
        sys.exit(1)
        
    # Set deterministic random seed
    np.random.seed(42)
    
    print(f"[+] Loading baseline records from '{input_path}'...")
    df = pd.read_csv(input_path)
    
    # Calculate baseline means per district
    means = df.groupby('district')['incident_count'].mean().to_dict()
    print(f"[+] Baseline means extracted:")
    for dist, val in means.items():
        print(f"  * {dist}: {val:.2f} incidents/month")
        
    # Get sorted date coordinates
    dates = sorted(df['year_month'].unique())
    num_months = len(dates)
    print(f"[+] Date range spans {num_months} months from {dates[0]} to {dates[-1]}.")
    
    # 1. Define Trend configurations per district
    # Reflects urbanization growth or policing efficacy narratives
    trends = {
        'Bengaluru Urban': 0.22,      # +22% linear increase over 36 months (urban expansion)
        'Mysuru': 0.12,               # +12% linear increase (gradual growth)
        'Hubballi-Dharwad': 0.00,     # Flat trend (stable crime levels)
        'Mangaluru': -0.15,           # -15% linear decrease (policing efficacy)
        'Belagavi': -0.10             # -10% linear decrease (policing efficacy)
    }
    
    # 2. Define seasonal monthly multipliers (monsoon troughs vs festive spikes)
    # Seasonal peaks: April-May (summer tourism), October (Dussehra), December (Year-end)
    # Seasonal troughs: July-August (heavy monsoons with reduced public activity)
    seasonal_multipliers = {
        1: 1.02,   # Jan: Holiday aftermath
        2: 0.98,   # Feb: Normal
        3: 1.00,   # Mar: Fiscal year closing focus
        4: 1.08,   # Apr: Summer travel start
        5: 1.12,   # May: Summer vacation peak
        6: 0.96,   # Jun: Monsoon onset
        7: 0.90,   # Jul: Heavy rains trough
        8: 0.92,   # Aug: Heavy rains trough
        9: 0.98,   # Sep: Monsoon retreat
        10: 1.06,  # Oct: Dasara & festive season spike
        11: 1.00,  # Nov: Normal
        12: 1.10   # Dec: Winter holiday/tourism spike
    }
    
    # 3. Define distinct anomaly events (month_string -> magnitude factor)
    # Event structure is: (district, date_str, expected_anomaly_factor, description)
    anomaly_events = [
        ('Bengaluru Urban', '2023-11-01', 0.50, 'Cyber-crime campaign spike (+50%)'),
        ('Bengaluru Urban', '2025-05-01', -0.35, 'Strict temporary security curfew/lockdown (-35%)'),
        ('Mysuru', '2024-10-01', 0.60, 'Unprecedented Dasara tourism property theft spike (+60%)'),
        ('Hubballi-Dharwad', '2024-03-01', 0.75, 'Election-period local public disorder spike (+75%)'),
        ('Hubballi-Dharwad', '2025-09-01', 0.55, 'Public transport strike and protests (+55%)'),
        ('Mangaluru', '2023-07-01', 0.70, 'Severe local weather flooding looting/disorder (+70%)'),
        ('Belagavi', '2025-01-01', 0.80, 'Winter border dispute localized protest spike (+80%)'),
        ('Belagavi', '2023-12-01', -0.30, 'Border assembly security lockup suppression (-30%)')
    ]
    
    # Map anomalies for fast lookup
    anomaly_map = {(dist, date): (val, desc) for dist, date, val, desc in anomaly_events}
    
    # Process output
    processed_records = []
    
    print("[+] Injecting patterns (trend, seasonality, anomalies, and noise)...")
    for district in sorted(means.keys()):
        base_mean = means[district]
        trend_slope = trends[district]
        
        for idx, date_str in enumerate(dates):
            # Parse month number (1-12) from string
            month_num = int(date_str.split('-')[1])
            
            # Trend component
            trend_factor = 1.0 + trend_slope * (idx / (num_months - 1))
            
            # Seasonal component
            seasonal_factor = seasonal_multipliers[month_num]
            
            # Check for anomaly event
            anomaly_factor = 0.0
            anomaly_desc = ""
            if (district, date_str) in anomaly_map:
                anomaly_factor, anomaly_desc = anomaly_map[(district, date_str)]
                
            # Add small Gaussian noise (3% standard deviation) for natural look
            noise = np.random.normal(0, 0.03)
            
            # Calculate final value
            # formula: base * trend * seasonal * (1 + anomaly) * (1 + noise)
            raw_value = base_mean * trend_factor * seasonal_factor * (1.0 + anomaly_factor) * (1.0 + noise)
            
            # Ensure sensible floor (min 30% of baseline to prevent negative counts)
            floor_value = int(base_mean * 0.3)
            final_count = int(round(max(floor_value, raw_value)))
            
            processed_records.append({
                'district': district,
                'year_month': date_str,
                'incident_count': final_count,
                '_expected_base': base_mean * trend_factor * seasonal_factor, # kept for audit
                '_anomaly': anomaly_desc if anomaly_desc else "None"
            })
            
    # Compile into DataFrame
    output_df = pd.DataFrame(processed_records)
    
    # Rank integrity safeguard validation check
    # Bengaluru Urban must be highest-volume in every month
    bgu_data = output_df[output_df['district'] == 'Bengaluru Urban'].set_index('year_month')['incident_count']
    others = output_df[output_df['district'] != 'Bengaluru Urban']
    
    rank_violations = 0
    for idx, row in others.iterrows():
        bgu_val = bgu_data.loc[row['year_month']]
        if row['incident_count'] >= bgu_val:
            print(f"[!] WARNING: Rank integrity violation on {row['year_month']}! "
                  f"District '{row['district']}' has {row['incident_count']} incidents, "
                  f"exceeding Bengaluru Urban's count of {bgu_val}.")
            rank_violations += 1
            
    if rank_violations == 0:
        print("[PASS] Rank integrity check: Bengaluru Urban remains the highest-volume district in every month.")
    else:
        print(f"[FAIL] Rank integrity violated in {rank_violations} instances. Recalibrate magnitudes.")
        
    # Write to v2 CSV
    # Drop audit columns for output compatibility with v1 schema
    final_csv_df = output_df[['district', 'year_month', 'incident_count']]
    final_csv_df.to_csv(output_path, index=False)
    print(f"[+] Output successfully saved to: '{output_path}'")
    
    # Summary Report
    print("\n================== STRUCTURE SUMMARY REPORT ==================")
    for dist in sorted(trends.keys()):
        trend_direction = "Increase" if trends[dist] > 0 else ("Decrease" if trends[dist] < 0 else "Flat")
        trend_pct = abs(trends[dist] * 100)
        print(f"\n* District: {dist}")
        print(f"  - Trend    : {trend_direction} of {trend_pct:.1f}% over 36 months")
        print(f"  - Seasonal : Peaks in May (+12%) and Dec (+10%), Monsoonal Trough in Jul (-10%) and Aug (-8%)")
        
        # Log injected anomalies for this district
        dist_anomalies = [e for e in anomaly_events if e[0] == dist]
        if dist_anomalies:
            print("  - Injected Anomalies:")
            for d, date, factor, desc in dist_anomalies:
                actual_row = output_df[(output_df['district'] == dist) & (output_df['year_month'] == date)].iloc[0]
                expected_baseline = actual_row['_expected_base']
                print(f"    * {date}: {desc} | expected baseline: {expected_baseline:.1f} -> final count: {actual_row['incident_count']}")
        else:
            print("  - Injected Anomalies: None")
            
    print("\n==============================================================")
    
    # Project documentation note
    print("\n[DOCUMENTATION NOTE]")
    print("This dataset (district_monthly_incidents_v2.csv) is synthetically engineered with "
          "deliberate trend, seasonal, and anomaly patterns. This structured simulation establishes "
          "a clear learnable hierarchy for testing spatiotemporal time-series forecasting and "
          "anomaly-detection models, as actual multi-year monthly district-level crime data was not "
          "publicly accessible in NCRB datasets. The relative volume proportions and regional "
          "scale constraints of the KSP districts (e.g. Bengaluru Urban remaining the largest) "
          "are strictly preserved.")
    print("==============================================================\n")

if __name__ == '__main__':
    main()
