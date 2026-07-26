import os
import pandas as pd
import numpy as np
import json
import re

def robust_read_csv(file_path, **kwargs):
    """
    Attempts to read a CSV file, falling back to alternative encodings
    if the default UTF-8 encoding fails.
    """
    encodings = ['utf-8', 'latin-1', 'cp1252']
    for enc in encodings:
        try:
            return pd.read_csv(file_path, encoding=enc, **kwargs)
        except (UnicodeDecodeError, TypeError):
            continue
    return pd.read_csv(file_path, **kwargs)

def clean_column_name(col):
    """
    Normalizes column names: strips whitespace, converts to uppercase,
    removes trailing metadata like '(Col. 2)', '(Col.3 + Col.4)', or '(Total)',
    and removes trailing hyphens or dashes.
    """
    col_str = str(col).strip().upper()
    col_str = re.sub(r'\s*\(\s*COL.*\)', '', col_str)
    col_str = re.sub(r'\s*\(\s*TOTAL.*\)', '', col_str, flags=re.IGNORECASE)
    col_str = col_str.strip()
    col_str = re.sub(r'\s*-\s*$', '', col_str) # strip trailing hyphens
    return col_str.strip()

def is_leaf_node(sl_no, all_sl_nos):
    """
    Determines if a serial number represents a leaf category or a parent summary category.
    E.g., if we have '3', '3.1', '3.1A', then '3' and '3.1' are parents and '3.1A' is a leaf.
    """
    sl_no_str = str(sl_no).strip()
    if not sl_no_str or sl_no_str == 'nan':
        return False
    for other in all_sl_nos:
        other_str = str(other).strip()
        if other_str == sl_no_str or not other_str or other_str == 'nan':
            continue
        # Check if other starts with sl_no and continues with a dot or a letter
        if other_str.startswith(sl_no_str):
            suffix = other_str[len(sl_no_str):]
            if len(suffix) > 0 and (suffix[0] == '.' or suffix[0].isalpha()):
                return False
    return True

def main():
    # Detect the script's own directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Dynamic path resolution to handle running inside project root or data/ subdirectory
    if os.path.isdir(os.path.join(script_dir, "data")) and script_dir.split(os.sep)[-1] != "data":
        data_dir = os.path.join(script_dir, "data")
    elif any(f.endswith('.csv') for f in os.listdir(script_dir)):
        data_dir = script_dir
    else:
        data_dir = "data"

    processed_dir = os.path.join(data_dir, "processed")
    os.makedirs(processed_dir, exist_ok=True)
    
    print("==============================================")
    print("   ASHEN PROTOCOL: DATA WRANGLING PIPELINE    ")
    print("==============================================\n")

    # Cleanup accidental nested "data/data" directory from previous runs
    nested_data_dir = os.path.join(data_dir, "data")
    if os.path.exists(nested_data_dir):
        try:
            import shutil
            shutil.rmtree(nested_data_dir)
            print(f" [🧹] Cleaned up duplicate nested directory: {nested_data_dir}\n")
        except Exception as e:
            pass

    # ------------------------------------------------
    # TASK 1: AUTONOMOUS PROFILING & TRIAGE
    # ------------------------------------------------
    print("--- Task 1: Profiling & Triage ---")
    files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    usable_files = []
    ignored_files = []
    
    for file in files:
        file_path = os.path.join(data_dir, file)
        try:
            # Load header to detect column names using robust CSV reader
            df_header = robust_read_csv(file_path, nrows=2)
            columns = [col.strip().upper() for col in df_header.columns]
            
            # Check for city/district column
            geo_col = None
            for col in df_header.columns:
                cleaned_col = clean_column_name(col)
                if cleaned_col in ['CITY', 'DISTRICT'] or 'CITY' in cleaned_col or 'DISTRICT' in cleaned_col:
                    if 'ACTS' not in cleaned_col and 'CODE' not in cleaned_col:
                        geo_col = col
                        break
            
            if geo_col:
                # Check for Bengaluru in full file
                df_full = robust_read_csv(file_path)
                has_bengaluru = df_full[geo_col].astype(str).str.contains('Bengaluru', case=False, na=False).any()
                
                if has_bengaluru:
                    usable_files.append((file, geo_col))
                    print(f" [+] USABLE: '{file}' (geo column: '{geo_col}')")
                else:
                    ignored_files.append((file, f"Contains geo column '{geo_col}' but NO Bengaluru data"))
                    print(f" [-] IGNORED: '{file}' (no Bengaluru data)")
            else:
                ignored_files.append((file, "Lacks City/District column"))
                print(f" [-] IGNORED: '{file}' (no geographic granularity)")
                
        except Exception as e:
            ignored_files.append((file, f"Failed to parse: {str(e)}"))
            print(f" [!] ERROR: '{file}' - {str(e)}")
            
    print(f"\nTriage Summary: {len(usable_files)} files usable, {len(ignored_files)} files ignored.\n")

    if not usable_files:
        print(" [!] Warning: No usable city-level files found. Check files in path:", data_dir)
        return

    # ------------------------------------------------
    # TASK 2: ISOLATION & CLEANING
    # ------------------------------------------------
    print("--- Task 2: Isolation & Cleaning ---")
    cleaned_datasets = {}
    
    for file, geo_col in usable_files:
        file_path = os.path.join(data_dir, file)
        df = robust_read_csv(file_path)
        
        # Clean columns
        df.columns = [clean_column_name(col) for col in df.columns]
        cleaned_geo_col = clean_column_name(geo_col)
        
        # Filter strictly for Bengaluru
        bengaluru_mask = df[cleaned_geo_col].astype(str).str.contains('Bengaluru', case=False, na=False)
        df_beng = df[bengaluru_mask].copy()
        
        # Drop structural total rows
        df_beng = df_beng[~df_beng[cleaned_geo_col].astype(str).str.contains('Total', case=False, na=False)]
        if 'SL. NO.' in df_beng.columns:
            df_beng = df_beng[~df_beng['SL. NO.'].astype(str).str.contains('Total', case=False, na=False)]
            
        # Handle NaN values
        for col in df_beng.columns:
            if df_beng[col].dtype in [np.float64, np.int64]:
                df_beng[col] = df_beng[col].fillna(0)
            else:
                df_beng[col] = df_beng[col].fillna("UNKNOWN")
                
        cleaned_datasets[file] = df_beng
        
        # Save cleaned file for review
        clean_file_name = file.replace('.csv', '_cleaned_bengaluru.csv')
        df_beng.to_csv(os.path.join(processed_dir, clean_file_name), index=False)
        print(f" [✓] Isolated & cleaned {len(df_beng)} rows from '{file}' -> Saved to processed/")

    # ------------------------------------------------
    # TASK 3: BASELINE EXTRACTION (THE SEED)
    # ------------------------------------------------
    print("\n--- Task 3: Baseline Extraction (Seed Generation) ---")
    seed_data = {
        "meta": {
            "target_city": "Bengaluru",
            "state": "Karnataka",
            "year_baseline": 2023,
            "description": "Baseline crime ratios and demographic profiles for Bengaluru (NCRB 2023). Used as mathematical seed for synthetic generator."
        },
        "bengaluru_volumes": {},
        "distributions": {}
    }
    
    # 3.1: SLL Crimes Total reported
    sll_disposal_file = 'citywise police disposal special and local laws.csv'
    if sll_disposal_file in cleaned_datasets:
        df_sll_disp = cleaned_datasets[sll_disposal_file]
        reported_col = 'CASES REPORTED DURING THE YEAR'
        if reported_col in df_sll_disp.columns:
            reported_cases = int(df_sll_disp[reported_col].values[0])
            seed_data["bengaluru_volumes"]["sll_cases_reported_2023"] = reported_cases
            print(f" [+] Bengaluru SLL reported volume: {reported_cases}")
            
    # 3.2: Crime against Children Total cases
    children_file = 'Crime against Children Indian Penal Code (IPC) Crimes and Special and Local Laws (SLL) in Metropolitan Cities from 2021 to 2023.csv'
    if children_file in cleaned_datasets:
        df_child = cleaned_datasets[children_file]
        cases_2023_col = '2023'
        if cases_2023_col in df_child.columns:
            child_cases = int(df_child[cases_2023_col].values[0])
            seed_data["bengaluru_volumes"]["crime_against_children_cases_reported_2023"] = child_cases
            print(f" [+] Bengaluru Crimes Against Children volume: {child_cases}")
            
    # 3.3: Juveniles Apprehended total and IPC crimes
    juveniles_ipc_file = 'Indian Penal Code (IPC) Crimes - Juveniles in Conflict with Law in Metropolitan Cities during 2023.csv'
    if juveniles_ipc_file in cleaned_datasets:
        df_juv = cleaned_datasets[juveniles_ipc_file]
        total_col = 'TOTAL COGNIZABLE IPC CRIMES'
        if total_col in df_juv.columns:
            juv_cases = int(df_juv[total_col].values[0])
            seed_data["bengaluru_volumes"]["juvenile_ipc_crimes_apprehended_2023"] = juv_cases
            print(f" [+] Bengaluru Juvenile IPC apprehended volume: {juv_cases}")

    # 3.4: SLL Crime Head Distribution
    sll_court_file = 'Crime Head-wise Court Disposal of Special and Local Laws (SLL) Crimes in Metropolitan Cities during 2023.csv'
    sll_court_path = os.path.join(data_dir, sll_court_file)
    if os.path.exists(sll_court_path):
        df_sll_heads = robust_read_csv(sll_court_path)
        df_sll_heads.columns = [clean_column_name(col) for col in df_sll_heads.columns]
        
        df_sll_heads['SL. NO.'] = df_sll_heads['SL. NO.'].astype(str).str.strip()
        df_sll_heads['CRIME HEAD'] = df_sll_heads['CRIME HEAD'].astype(str).str.strip()
        
        trial_col = [c for c in df_sll_heads.columns if 'SENT FOR TRIAL DURING THE YEAR' in c]
        if trial_col:
            t_col = trial_col[0]
            df_sll_heads[t_col] = pd.to_numeric(df_sll_heads[t_col], errors='coerce').fillna(0)
            
            df_sll_heads = df_sll_heads[~df_sll_heads['CRIME HEAD'].str.contains('TOTAL', case=False, na=False)]
            df_sll_heads = df_sll_heads[~df_sll_heads['SL. NO.'].str.contains('TOTAL', case=False, na=False)]
            df_sll_heads = df_sll_heads[df_sll_heads['CRIME HEAD'] != 'nan']
            
            all_sl_nos = df_sll_heads['SL. NO.'].tolist()
            leaf_indices = [idx for idx, row in df_sll_heads.iterrows() if is_leaf_node(row['SL. NO.'], all_sl_nos)]
            df_leaves = df_sll_heads.loc[leaf_indices].copy()
            
            total_sll_trial_cases = df_leaves[t_col].sum()
            df_leaves['PROPORTION'] = df_leaves[t_col] / total_sll_trial_cases if total_sll_trial_cases > 0 else 0.0
            
            seed_data["distributions"]["sll_crimes"] = [
                {"crime_head": row["CRIME HEAD"], "cases_metropolitan_trial_aggregate": int(row[t_col]), "proportion": float(row["PROPORTION"])}
                for _, row in df_leaves.iterrows()
            ]
            print(f" [✓] Extracted SLL distributions: {len(df_leaves)} SLL crime heads.")

    # 3.5: IPC Crime Head Distribution
    ipc_met_file = 'Crime Head-wise Police Disposal of Indian Penal Code (IPC) Crimes in Metropolitan Cities during 2023.csv'
    ipc_met_path = os.path.join(data_dir, ipc_met_file)
    if os.path.exists(ipc_met_path):
        df_ipc_heads = robust_read_csv(ipc_met_path)
        df_ipc_heads.columns = [clean_column_name(col) for col in df_ipc_heads.columns]
        
        df_ipc_heads['SL. NO.'] = df_ipc_heads['SL. NO.'].astype(str).str.strip()
        df_ipc_heads['CRIME HEAD'] = df_ipc_heads['CRIME HEAD'].astype(str).str.strip()
        
        reported_col = [c for c in df_ipc_heads.columns if 'REPORTED DURING THE YEAR' in c]
        if reported_col:
            r_col = reported_col[0]
            df_ipc_heads[r_col] = pd.to_numeric(df_ipc_heads[r_col], errors='coerce').fillna(0)
            
            df_ipc_heads = df_ipc_heads[~df_ipc_heads['CRIME HEAD'].str.contains('TOTAL', case=False, na=False)]
            df_ipc_heads = df_ipc_heads[~df_ipc_heads['SL. NO.'].str.contains('TOTAL', case=False, na=False)]
            df_ipc_heads = df_ipc_heads[df_ipc_heads['CRIME HEAD'] != 'nan']
            
            all_sl_nos = df_ipc_heads['SL. NO.'].tolist()
            leaf_indices = [idx for idx, row in df_ipc_heads.iterrows() if is_leaf_node(row['SL. NO.'], all_sl_nos)]
            df_leaves = df_ipc_heads.loc[leaf_indices].copy()
            
            total_ipc_cases = df_leaves[r_col].sum()
            df_leaves['PROPORTION'] = df_leaves[r_col] / total_ipc_cases if total_ipc_cases > 0 else 0.0
            
            seed_data["distributions"]["ipc_crimes"] = [
                {"crime_head": row["CRIME HEAD"], "cases_metropolitan_aggregate": int(row[r_col]), "proportion": float(row["PROPORTION"])}
                for _, row in df_leaves.iterrows()
            ]
            print(f" [✓] Extracted IPC distributions: {len(df_leaves)} IPC crime heads.")

    # 3.6: Crimes Against Children Distribution
    child_disposal_file = 'Crime Head-wise Police Disposal of Crime against Children in Metropolitan Cities during 2023.csv'
    child_disposal_path = os.path.join(data_dir, child_disposal_file)
    if os.path.exists(child_disposal_path):
        df_child_heads = robust_read_csv(child_disposal_path)
        df_child_heads.columns = [clean_column_name(col) for col in df_child_heads.columns]
        
        df_child_heads['SL. NO.'] = df_child_heads['SL. NO.'].astype(str).str.strip()
        df_child_heads['CRIME HEAD'] = df_child_heads['CRIME HEAD'].astype(str).str.strip()
        
        reported_col = [c for c in df_child_heads.columns if 'REPORTED DURING THE YEAR' in c]
        if reported_col:
            r_col = reported_col[0]
            df_child_heads[r_col] = pd.to_numeric(df_child_heads[r_col], errors='coerce').fillna(0)
            
            df_child_heads = df_child_heads[~df_child_heads['CRIME HEAD'].str.contains('TOTAL', case=False, na=False)]
            df_child_heads = df_child_heads[~df_child_heads['SL. NO.'].str.contains('TOTAL', case=False, na=False)]
            df_child_heads = df_child_heads[df_child_heads['CRIME HEAD'] != 'nan']
            
            all_sl_nos = df_child_heads['SL. NO.'].tolist()
            leaf_indices = [idx for idx, row in df_child_heads.iterrows() if is_leaf_node(row['SL. NO.'], all_sl_nos)]
            df_leaves = df_child_heads.loc[leaf_indices].copy()
            
            total_child_cases = df_leaves[r_col].sum()
            df_leaves['PROPORTION'] = df_leaves[r_col] / total_child_cases if total_child_cases > 0 else 0.0
            
            seed_data["distributions"]["crimes_against_children"] = [
                {"crime_head": row["CRIME HEAD"], "cases_metropolitan_aggregate": int(row[r_col]), "proportion": float(row["PROPORTION"])}
                for _, row in df_leaves.iterrows()
            ]
            print(f" [✓] Extracted Children crime distributions: {len(df_leaves)} crime heads.")

    # 3.7: SLL Arrest Demographics & Outcomes
    sll_arrests_file = 'Disposal of Persons Arrested under Special and Local Laws (SLL) Crimes in Metropolitan Cities during 2023.csv'
    if sll_arrests_file in cleaned_datasets:
        df_arrests = cleaned_datasets[sll_arrests_file]
        m_arr = int(df_arrests['PERSONS ARRESTED - MALE'].values[0])
        f_arr = int(df_arrests['PERSONS ARRESTED - FEMALE'].values[0])
        t_arr = int(df_arrests['PERSONS ARRESTED - TRANSGENDER'].values[0])
        total_arr = int(df_arrests['PERSONS ARRESTED - TOTAL'].values[0])
        
        m_cs = int(df_arrests['PERSONS CHARGE SHEETED - MALE'].values[0])
        f_cs = int(df_arrests['PERSONS CHARGE SHEETED - FEMALE'].values[0])
        t_cs = int(df_arrests['PERSONS CHARGE SHEETED - TRANSGENDER'].values[0])
        total_cs = int(df_arrests['PERSONS CHARGE SHEETED - TOTAL'].values[0])
        
        m_conv = int(df_arrests['PERSONS CONVICTED - MALE'].values[0])
        f_conv = int(df_arrests['PERSONS CONVICTED - FEMALE'].values[0])
        t_conv = int(df_arrests['PERSONS CONVICTED - TRANSGENDER'].values[0])
        total_conv = int(df_arrests['PERSONS CONVICTED - TOTAL'].values[0])
        
        total_disch = int(df_arrests['PERSONS DISCHARGED - TOTAL'].values[0])
        total_acq = int(df_arrests['PERSONS ACQUITTED - TOTAL'].values[0])
        
        total_disposed_cases = total_conv + total_disch + total_acq
        
        seed_data["bengaluru_demographics_and_outcomes"] = {
            "sll_arrests_gender_distribution": {
                "MALE": float(m_arr / total_arr) if total_arr > 0 else 0.0,
                "FEMALE": float(f_arr / total_arr) if total_arr > 0 else 0.0,
                "TRANSGENDER": float(t_arr / total_arr) if total_arr > 0 else 0.0
            },
            "sll_arrest_outcomes": {
                "chargesheet_rate_relative_to_arrests": float(total_cs / total_arr) if total_arr > 0 else 0.0,
                "conviction_rate": float(total_conv / total_disposed_cases) if total_disposed_cases > 0 else 0.0,
                "discharge_rate": float(total_disch / total_disposed_cases) if total_disposed_cases > 0 else 0.0,
                "acquittal_rate": float(total_acq / total_disposed_cases) if total_disposed_cases > 0 else 0.0
            }
        }
        print(" [✓] Extracted SLL arrest demographics & outcomes.")

    # 3.8: Juvenile Demographics
    juv_edu_file = 'Education and Family Background of Juveniles Apprehended in Metropolitan Cities during 2023.csv'
    if juv_edu_file in cleaned_datasets:
        df_edu = cleaned_datasets[juv_edu_file]
        
        illiterate = int(df_edu['EDUCATION - ILLITERATE'].values[0])
        primary = int(df_edu['EDUCATION - UPTO PRIMARY'].values[0])
        matric = int(df_edu['EDUCATION - ABOVE PRIMARY TO MATRIC'].values[0])
        high_sec = int(df_edu['EDUCATION - ABOVE MATRIC TO HIGH SECONDARY'].values[0])
        higher_sec = int(df_edu['EDUCATION - ABOVE HIGHER SECONDARY'].values[0])
        total_edu = int(df_edu['EDUCATION - TOTAL'].values[0])
        
        parents = int(df_edu['FAMILY BACKGROUND - LIVING WITH PARENTS'].values[0])
        guardians = int(df_edu['FAMILY BACKGROUND - LIVING WITH GUARDIANS'].values[0])
        homeless = int(df_edu['FAMILY BACKGROUND - HOME-LESS'].values[0])
        total_fam = int(df_edu['FAMILY BACKGROUND - TOTAL'].values[0])
        
        if "bengaluru_demographics_and_outcomes" not in seed_data:
            seed_data["bengaluru_demographics_and_outcomes"] = {}
            
        seed_data["bengaluru_demographics_and_outcomes"]["juvenile_socioeconomics"] = {
            "education_distribution": {
                "ILLITERATE": float(illiterate / total_edu) if total_edu > 0 else 0.0,
                "UPTO_PRIMARY": float(primary / total_edu) if total_edu > 0 else 0.0,
                "ABOVE_PRIMARY_TO_MATRIC": float(matric / total_edu) if total_edu > 0 else 0.0,
                "ABOVE_MATRIC_TO_HIGH_SECONDARY": float(high_sec / total_edu) if total_edu > 0 else 0.0,
                "ABOVE_HIGHER_SECONDARY": float(higher_sec / total_edu) if total_edu > 0 else 0.0
            },
            "family_background_distribution": {
                "LIVING_WITH_PARENTS": float(parents / total_fam) if total_fam > 0 else 0.0,
                "LIVING_WITH_GUARDIANS": float(guardians / total_fam) if total_fam > 0 else 0.0,
                "HOMELESS": float(homeless / total_fam) if total_fam > 0 else 0.0
            }
        }
        print(" [✓] Extracted Juvenile Apprehended socio-economic profiles.")

    # Save final baseline seed
    seed_output_path = os.path.join(processed_dir, "bengaluru_crime_seed.json")
    with open(seed_output_path, 'w', encoding='utf-8') as f:
        json.dump(seed_data, f, indent=2)
        
    print(f"\n[SUCCESS] Baseline seed file successfully created at '{seed_output_path}'")
    print("==============================================\n")

if __name__ == "__main__":
    main()
