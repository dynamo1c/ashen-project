import os
import pandas as pd

def main():
    print("==================================================")
    print("ASHEN PROTOCOL - ONTOLOGY BACKFILL SCRIPT")
    print("==================================================")
    
    csv_path = 'offenders_seed.csv'
    if not os.path.exists(csv_path):
        print(f"[-] Error: {csv_path} not found in workspace.")
        return
        
    print("[+] Loading offenders_seed.csv...")
    df = pd.read_csv(csv_path)
    
    print("[+] Extracting unique offender names...")
    # Gather unique names and map to sequential stable IDs
    unique_names = sorted(df['offender_name'].unique())
    print(f"  * Total suspect rows: {len(df)}")
    print(f"  * Unique offenders: {len(unique_names)}")
    
    name_to_id = {name: f"OFF-{i+1:06d}" for i, name in enumerate(unique_names)}
    
    print("[+] Overwriting offender_id column with stable IDs...")
    df['offender_id'] = df['offender_name'].map(name_to_id)
    
    print(f"[+] Saving backfilled records to {csv_path}...")
    df.to_csv(csv_path, index=False)
    print("[+] Backfill complete!")
    print("==================================================")

if __name__ == '__main__':
    main()
