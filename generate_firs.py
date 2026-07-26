import os
import json
import random
import datetime
import numpy as np
import pandas as pd
from faker import Faker

# Initialize Faker
fake = Faker('en_IN')

# Set seeds for reproducibility
np.random.seed(42)
random.seed(42)
Faker.seed(42)

def main():
    print("==================================================")
    print("ASHEN PROTOCOL SYNTHETIC DATA GENERATOR")
    print("==================================================")
    
    # 1. Load NCRB distributions from JSON baseline
    print("Loading crime seed data from JSON...")
    seed_path = os.path.join('data', 'processed', 'bengaluru_crime_seed.json')
    if not os.path.exists(seed_path):
        raise FileNotFoundError(f"Seed file not found at {seed_path}")
        
    with open(seed_path, 'r', encoding='utf-8') as f:
        seed_data = json.load(f)
        
    crime_dict = {}
    
    # Extract from SLL crimes
    for item in seed_data['distributions']['sll_crimes']:
        cases = item.get('cases_metropolitan_trial_aggregate', 0)
        if cases > 0:
            crime_dict[item['crime_head']] = crime_dict.get(item['crime_head'], 0) + cases

    # Extract from IPC crimes
    for item in seed_data['distributions']['ipc_crimes']:
        cases = item.get('cases_metropolitan_aggregate', 0)
        if cases > 0:
            crime_dict[item['crime_head']] = crime_dict.get(item['crime_head'], 0) + cases

    # Extract from Crimes against children
    for item in seed_data['distributions']['crimes_against_children']:
        cases = item.get('cases_metropolitan_aggregate', 0)
        if cases > 0:
            crime_dict[item['crime_head']] = crime_dict.get(item['crime_head'], 0) + cases

    crime_choices = list(crime_dict.keys())
    crime_counts = list(crime_dict.values())
    total_cases = sum(crime_counts)
    crime_probabilities = [c / total_cases for c in crime_counts]
    print(f"Loaded {len(crime_choices)} unique crime heads from seed baseline.")

    # Get gender distribution from seed
    gender_dist = seed_data['bengaluru_demographics_and_outcomes']['sll_arrests_gender_distribution']
    genders = ['MALE', 'FEMALE', 'TRANSGENDER']
    gender_probs = [gender_dist['MALE'], gender_dist['FEMALE'], gender_dist['TRANSGENDER']]
    sum_g_probs = sum(gender_probs)
    gender_probs = [p / sum_g_probs for p in gender_probs]
    print(f"Demographics loaded: MALE={gender_probs[0]:.2%}, FEMALE={gender_probs[1]:.2%}, TRANSGENDER={gender_probs[2]:.2%}")

    # 2. Setup district configurations for Karnataka
    districts = ['Bengaluru Urban', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi']
    district_probs = [0.45, 0.15, 0.15, 0.15, 0.10] # Weights reflecting population/urban density
    
    district_info = {
        'Bengaluru Urban': {
            'code': 'BGU',
            'lat_center': 12.9716, 'lon_center': 77.5946, 'lat_std': 0.05, 'lon_std': 0.05,
            'stations': ['Vidhana Soudha PS', 'Indiranagar PS', 'Koramangala PS', 'Whitefield PS', 'Jayanagar PS', 'Majestic PS', 'Yeshwanthpur PS']
        },
        'Mysuru': {
            'code': 'MYS',
            'lat_center': 12.2958, 'lon_center': 76.6394, 'lat_std': 0.04, 'lon_std': 0.04,
            'stations': ['Devaraja PS', 'Lakshmipuram PS', 'Kuvempunagar PS', 'Saraswathipuram PS', 'Nazarbad PS']
        },
        'Hubballi-Dharwad': {
            'code': 'HBD',
            'lat_center': 15.3647, 'lon_center': 75.1240, 'lat_std': 0.05, 'lon_std': 0.05,
            'stations': ['Suburban PS', 'Gokul Road PS', 'Vidyanagar PS', 'Dharwad Town PS', 'APMC PS']
        },
        'Mangaluru': {
            'code': 'MNG',
            'lat_center': 12.9141, 'lon_center': 74.8560, 'lat_std': 0.03, 'lon_std': 0.03,
            'stations': ['Barke PS', 'Kadri PS', 'Urwa PS', 'Pandeshwar PS', 'Mangaluru East PS']
        },
        'Belagavi': {
            'code': 'BEL',
            'lat_center': 15.8497, 'lon_center': 74.4977, 'lat_std': 0.06, 'lon_std': 0.06,
            'stations': ['Khade Bazar PS', 'Market PS', 'Camp PS', 'Udyambag PS', 'Shahapur PS']
        }
    }

    # 3. Pre-generate offender pools for performance
    print("Pre-generating name components and offender profiles...")
    first_names = [fake.first_name() for _ in range(1000)]
    last_names = [fake.last_name() for _ in range(1000)]
    
    def make_profiles(num_profiles, is_repeat, start_id):
        profiles = []
        for i in range(num_profiles):
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            age = int(np.random.triangular(18, 28, 65))
            gender = np.random.choice(genders, p=gender_probs)
            if is_repeat:
                base_risk = round(float(np.random.uniform(50.0, 98.0)), 2)
            else:
                base_risk = round(float(np.random.uniform(5.0, 50.0)), 2)
            profiles.append({
                'offender_id': f"OFF-{start_id + i:06d}",
                'name': name,
                'age': age,
                'gender': gender,
                'base_risk_score': base_risk
            })
        return profiles

    print("Generating 80,000 single-incident suspect profiles...")
    single_profiles = make_profiles(80000, is_repeat=False, start_id=1)
    print("Generating 5,000 repeat suspect profiles...")
    repeat_profiles = make_profiles(5000, is_repeat=True, start_id=80001)

    # Pre-define 1,000 gangs of repeat suspects (2 to 4 members each)
    print("Structuring criminal gang associations...")
    gangs = []
    for _ in range(1000):
        gang_size = random.choice([2, 3, 4])
        gang_members = random.sample(range(5000), gang_size)
        gangs.append(gang_members)

    # 4. Contextual arrays for RAG description generator
    theft_tools = ["an iron crowbar", "screwdrivers", "heavy-duty bolt cutters", "a glass cutter", "duplicate keys"]
    theft_targets = ["main door padlock", "rear sliding glass window", "wooden back door latch", "shop rolling shutter", "bedroom wardrobe safety locker"]
    theft_items = [
        "gold ornaments weighing approximately 80 grams and Rs. 45,000 cash",
        "a high-end laptop, a digital camera, and Rs. 15,000 cash",
        "silver utensils, a luxury wrist watch, and some property documents",
        "branded electronic items and cash of Rs. 30,000 from the cash drawer",
        "cash box containing Rs. 85,000 and business invoices"
    ]
    theft_times = ["late night hours under cover of darkness", "afternoon hours when the house was locked and unoccupied", "early morning hours during the public holiday weekend"]

    cyber_lures = [
        "a phishing link sent via SMS claiming bank account suspension",
        "a fake lottery message on WhatsApp offering Rs. 25 lakhs prize money",
        "a phone call from an unknown suspect pretending to be a bank manager requesting verification",
        "an email containing a malicious PDF invoice attachment",
        "a fraudulent social media advertisement promising high-yield crypto investment returns"
    ]
    cyber_actions = [
        "tricked the victim into revealing their netbanking credentials and credit card OTP",
        "installed a remote access application (AnyDesk) to compromise the victim's mobile device",
        "cloned the victim's debit card details using a skimming device at an unmonitored ATM",
        "induced the victim to transfer money to a fraudulent escrow account",
        "hacked the victim's social media account to send urgent money requests to their contacts"
    ]
    cyber_losses = ["Rs. 50,000", "Rs. 1,20,000", "Rs. 35,000", "Rs. 2,10,000", "Rs. 85,000"]

    drug_locations = ["near a public park", "at a highway checkpoint", "outside a college campus", "near a bus stand", "in an abandoned building alley"]
    drug_activities = [
        "loitering suspiciously with a black shoulder bag",
        "speeding on an unregistered scooter and trying to escape upon spotting the police team",
        "huddling in a small group and exchanging packets in a shady manner",
        "acting nervous and attempting to throw away a plastic packet when questioned"
    ]
    drug_contrabands = [
        "ganja (marijuana) weighing 1.5 kilograms",
        "heroin powder weighing 45 grams",
        "MDMA crystals weighing 12 grams",
        "brown sugar weighing 25 grams",
        "50 bottles of non-duty-paid country liquor"
    ]
    drug_acts = ["NDPS Act", "Excise Act", "NDPS Act", "NDPS Act", "Excise Act"]

    violent_conflicts = [
        "a heated argument regarding a property boundary line",
        "a financial dispute regarding unpaid wages",
        "a long-standing personal enmity between families",
        "a road-rage confrontation after a minor two-wheeler collision",
        "a sudden dispute over local festival celebrations"
    ]
    violent_weapons = ["a wooden club", "an iron rod", "a kitchen knife", "a heavy metal pipe", "blunt physical force"]
    violent_injuries = ["severe head injuries and skull fractures", "lacerations on the chest and shoulder", "fractures in the left hand and multiple bruises", "concussion and soft tissue damage"]
    violent_hospitals = ["shifted to the Government General Hospital", "admitted to the District Hospital", "taken to a nearby private clinic for emergency care"]

    fraud_methods = [
        "promising a guaranteed job in the State Secretariat in exchange for upfront document fees",
        "drafting forged property registration documents for a plot that belonged to someone else",
        "creating a fake chit fund scheme and collecting monthly contributions from gullible investors",
        "selling counterfeit electronics under popular brand names using fake certificates",
        "setting up a dummy website and taking bookings for vacation rentals that do not exist"
    ]
    fraud_losses = ["Rs. 3,00,000", "Rs. 7,50,000", "Rs. 2,50,000", "Rs. 5,00,000", "Rs. 1,80,000"]

    def generate_mo_description(crime_head, formatted_date):
        ch = crime_head.lower()
        time_str = f"{random.randint(1, 12)}:{random.randint(10, 59):02d} {'AM' if random.choice([True, False]) else 'PM'}"
        
        if any(k in ch for k in ['theft', 'robbery', 'dacoity', 'extortion', 'burglary', 'stolen', 'house-breaking', 'possession', 'take away']):
            tool = random.choice(theft_tools)
            target = random.choice(theft_targets)
            items = random.choice(theft_items)
            time_of_day = random.choice(theft_times)
            return f"On {formatted_date} at around {time_str}, an incident of housebreaking and theft was reported. The suspect utilized {tool} to break open the {target} during {time_of_day}. The suspect ransacked the house and escaped with {items}. Fingerprint experts and canine squad visited the scene. Case registered."
        
        elif any(k in ch for k in ['it act', 'information technology', 'cyber', 'internet', 'online', 'computer', 'unauthorized', 'phishing', 'intellectual property', 'copy right', 'trade mark']):
            lure = random.choice(cyber_lures)
            action = random.choice(cyber_actions)
            loss = random.choice(cyber_losses)
            return f"The complainant reported that on {formatted_date}, they were victims of an online financial fraud. The suspect deployed {lure} and subsequently {action}. This resulted in a total unauthorized transfer of {loss} from the victim's account. Technical cell is analyzing call data records and IP logs."
        
        elif any(k in ch for k in ['ndps', 'drug', 'narcotic', 'consumption', 'trafficking', 'excise', 'liquor', 'alcohol', 'excise act', 'prohibition act']):
            loc = random.choice(drug_locations)
            act = random.choice(drug_activities)
            contra = random.choice(drug_contrabands)
            act_name = random.choice(drug_acts)
            return f"On {formatted_date} at {time_str}, during a special police drive {loc}, a patrol team spotted the suspect who was found {act}. A search of the suspect led to the recovery of {contra}. The contraband was seized under a panchnama. The suspect was booked under the relevant sections of the {act_name}."
        
        elif any(k in ch for k in ['murder', 'homicide', 'suicide', 'death', 'negligence', 'hurt', 'assault', 'outrage', 'acid attack', 'rape', 'pocso', 'child', 'kidnapping', 'abduction', 'trafficking', 'rioting', 'riots', 'enmity', 'rivalry', 'injury']):
            conflict = random.choice(violent_conflicts)
            weapon = random.choice(violent_weapons)
            injury = random.choice(violent_injuries)
            hosp = random.choice(violent_hospitals)
            return f"On {formatted_date} at {time_str}, a violent confrontation occurred following {conflict}. The suspect assaulted the victim using {weapon}, inflicting {injury}. The victim was immediately {hosp}. The suspect fled the spot before police arrival. Local search teams have been formed."
        
        elif any(k in ch for k in ['cheating', 'forgery', 'fraud', 'counterfeit', 'stamp', 'benami', 'bribery', 'corruption', 'negotiable instruments', 'chit fund', 'lotteries']):
            method = random.choice(fraud_methods)
            loss = random.choice(fraud_losses)
            return f"The complainant filed a case of cheating and criminal breach of trust, stating that the suspect defrauded them of {loss}. The suspect achieved this by {method}. Upon verification, the documents and promises provided by the suspect were found to be completely fraudulent. Investigation is ongoing."
        
        else:
            return f"On {formatted_date} at around {time_str}, during routine check and surveillance of local laws, police registered an offence regarding {crime_head}. The suspect was found violating municipal regulations and state police acts. Documentation was processed on the spot, and relevant charges have been applied."

    def generate_coords(district):
        info = district_info[district]
        lat = np.random.normal(info['lat_center'], info['lat_std'])
        lon = np.random.normal(info['lon_center'], info['lon_std'])
        lat = np.clip(lat, 11.5, 18.5)
        lon = np.clip(lon, 74.0, 78.5)
        return round(float(lat), 6), round(float(lon), 6)

    # 5. Pre-select categorical distributions for mass speed
    print("Pre-selecting districts, crime categories, and datetimes...")
    sampled_districts = np.random.choice(districts, size=75000, p=district_probs)
    sampled_crimes = np.random.choice(crime_choices, size=75000, p=crime_probabilities)

    start_date = datetime.datetime(2023, 1, 1)
    end_date = datetime.datetime(2025, 12, 31, 23, 59, 59)
    delta_seconds = int((end_date - start_date).total_seconds())
    random_offsets = np.random.randint(0, delta_seconds, size=75000)

    incident_timestamps = []
    for offset in random_offsets:
        dt = start_date + datetime.timedelta(seconds=int(offset))
        incident_timestamps.append(dt)

    # Setup trackers
    fir_records = []
    offender_records = []
    single_suspect_ptr = 0
    offender_row_counter = 1

    # Pre-generate co-offender status (roughly 20% True, 80% False)
    is_multi_suspect = np.random.choice([True, False], size=75000, p=[0.20, 0.80])

    # 6. Core Incident Loop (75,000 iterations)
    print("Executing high-performance incident transaction generation loop...")
    for i in range(75000):
        dt = incident_timestamps[i]
        dt_str = dt.strftime('%Y-%m-%d %H:%M:%S')
        dt_formatted_date = dt.strftime('%d-%b-%Y')
        
        district = sampled_districts[i]
        code = district_info[district]['code']
        year = dt.year
        
        # Unique FIR number: KA-<DIST>-<YEAR>-<ID>
        fir_num = f"KA-{code}-{year}-{i+1:06d}"
        
        # Geolocation
        lat, lon = generate_coords(district)
        
        # Police Station
        police_station = random.choice(district_info[district]['stations'])
        
        # Crime Head
        crime_head = sampled_crimes[i]
        
        # Modus Operandi (engineered text for RAG)
        mo = generate_mo_description(crime_head, dt_formatted_date)
        
        # Record creation
        fir_records.append({
            'fir_number': fir_num,
            'district': district,
            'police_station': police_station,
            'latitude': lat,
            'longitude': lon,
            'crime_head': crime_head,
            'incident_timestamp': dt_str,
            'mo_description': mo
        })
        
        # Assign suspects
        if is_multi_suspect[i]:
            # Multi-suspect / Gang event
            if random.random() < 0.40:
                # Assign a pre-defined gang
                gang_idx = random.randint(0, 999)
                gang_members = gangs[gang_idx]
                for idx in gang_members:
                    prof = repeat_profiles[idx]
                    offender_records.append({
                        'offender_id': prof['offender_id'],
                        'offender_name': prof['name'],
                        'associated_fir_number': fir_num,
                        'age': prof['age'],
                        'gender': prof['gender'],
                        'base_risk_score': prof['base_risk_score']
                    })
            else:
                # Select random suspects (mix of repeat and single-incident)
                num_suspects = random.choice([2, 3, 4])
                for _ in range(num_suspects):
                    if random.random() < 0.70:
                        idx = random.randint(0, 4999)
                        prof = repeat_profiles[idx]
                    else:
                        prof = single_profiles[single_suspect_ptr]
                        single_suspect_ptr += 1
                    
                    offender_records.append({
                        'offender_id': prof['offender_id'],
                        'offender_name': prof['name'],
                        'associated_fir_number': fir_num,
                        'age': prof['age'],
                        'gender': prof['gender'],
                        'base_risk_score': prof['base_risk_score']
                    })
        else:
            # Single suspect event
            if random.random() < 0.15:
                # Repeat suspect
                idx = random.randint(0, 4999)
                prof = repeat_profiles[idx]
            else:
                # Single-incident suspect
                prof = single_profiles[single_suspect_ptr]
                single_suspect_ptr += 1
                
            offender_records.append({
                'offender_id': prof['offender_id'],
                'offender_name': prof['name'],
                'associated_fir_number': fir_num,
                'age': prof['age'],
                'gender': prof['gender'],
                'base_risk_score': prof['base_risk_score']
            })
            
        # Logging statement every 10,000 records
        if (i + 1) % 10000 == 0:
            print(f"  [Progress] Generated {i + 1} / 75,000 incident transactions...")

    # 7. Convert and aggregate risk scores
    print("Processing tabular dataset conversions...")
    fir_df = pd.DataFrame(fir_records)
    offenders_df = pd.DataFrame(offender_records)
    
    print("Aggregating district risk scores on spatio-temporal index (district * month * year)...")
    fir_df['datetime'] = pd.to_datetime(fir_df['incident_timestamp'])
    fir_df['year'] = fir_df['datetime'].dt.year
    fir_df['month'] = fir_df['datetime'].dt.month
    
    drs_grouped = fir_df.groupby(['district', 'year', 'month']).size().reset_index(name='base_incident_count')
    
    # Calculate localized statistical distributions per district for z-score classification
    dists_stats = drs_grouped.groupby('district')['base_incident_count'].agg(['mean', 'std']).to_dict(orient='index')
    
    drs_records = []
    for _, row in drs_grouped.iterrows():
        dist = row['district']
        yr = int(row['year'])
        mth = int(row['month'])
        count = int(row['base_incident_count'])
        
        code = district_info[dist]['code']
        record_id = f"DRS-{code}-{yr}-{mth:02d}"
        
        mean = dists_stats[dist]['mean']
        std = dists_stats[dist]['std'] if dists_stats[dist]['std'] > 0 else 1.0
        
        z_score = (count - mean) / std
        if z_score > 0.8:
            risk_level = 'HIGH'
        elif z_score < -0.8:
            risk_level = 'LOW'
        else:
            risk_level = 'MEDIUM'
            
        drs_records.append({
            'record_id': record_id,
            'district': dist,
            'statistical_month': mth,
            'statistical_year': yr,
            'base_incident_count': count,
            'predicted_risk_level': risk_level
        })
        
    drs_df = pd.DataFrame(drs_records)

    # Cleanup temporary grouping fields in final FIR records
    fir_df = fir_df.drop(columns=['datetime', 'year', 'month'])

    # 8. Export directly to output files
    print("Writing output CSV files to workspace...")
    fir_df.to_csv('fir_records_seed.csv', index=False)
    print("  Saved 'fir_records_seed.csv' containing 75,000 incident transactions.")
    
    offenders_df.to_csv('offenders_seed.csv', index=False)
    print(f"  Saved 'offenders_seed.csv' containing {len(offenders_df)} suspect-incident records.")
    
    drs_df.to_csv('district_risk_scores_seed.csv', index=False)
    print(f"  Saved 'district_risk_scores_seed.csv' containing {len(drs_df)} aggregated risk score records.")
    
    print("==================================================")
    print("DATA GENERATION ENGINE COMPLETE!")
    print("==================================================")

if __name__ == '__main__':
    main()
