# Karnataka Police Stations — Reference Dataset
### Bengaluru Urban · Mysuru · Hubballi-Dharwad · Mangaluru (Dakshina Kannada) · Belagavi

Compiled: July 25, 2026 — for Ashen Protocol

---

## ⚠️ Read this before you use the data

This is **not** a "foolproof" survey-grade dataset, and I want to be straight with you about why:

1. **No live geocoding available.** My sandbox can only reach package-registry domains (npm, pip, GitHub, crates), not a geocoding API like Nominatim or Google Maps. I could not verify GPS coordinates for every station.
2. **Sources are aggregator/directory sites**, not the live Karnataka State Police (KSP) database. Station jurisdictions, especially in fast-growing Bengaluru, get re-drawn periodically (new stations split off old ones), so a few entries may be stale.
3. **Coordinate coverage is uneven.** Where I found a coordinate pair directly tied to a named station (from Wikipedia, Mappls, or atozbrowse listings), I've included it and marked it `verified: source-linked`. Everywhere else, coordinates are left blank — I did **not** estimate or interpolate them, because a wrong coordinate in a crime-analytics dashboard is worse than a missing one.
4. **Bengaluru Urban district** is administratively larger than "Bengaluru City Police" (it also includes Anekal taluk / Bengaluru Rural-adjacent stations). This file covers the **Bengaluru City Police jurisdiction** (~108 L&O stations across 8 zones), which is what's normally meant by "Bengaluru Urban" police stations. Anekal-taluk-specific rural stations are not separately itemized here — flag if you need them.

### How to close the coordinate gap yourself
At the bottom of this file is a Python script (`geocode_stations.py`) that reads a CSV of station name + address and geocodes it via OpenStreetMap's free Nominatim API. Run it from your own machine/server (needs internet access I don't have here):

```bash
pip install requests
python geocode_stations.py stations.csv stations_geocoded.csv
```
Respect Nominatim's 1 request/second rate limit — the script already throttles for you.

---

## District 1: Bengaluru Urban (Bengaluru City Police — 8 Zones)

*Source: Bengaluru City Police public station list (bcp.gov.in), cross-checked against findeasy.in aggregation. 108 law & order stations across East, Central, West, South, North, North-East, South-East, and Whitefield zones. Coordinates not independently verified — see note above.*

### East Zone
| Station | Address |
|---|---|
| Banasawadi | 5th Main, 3rd Cross Rd, near Electricity Complaint Office, Kalyan Nagar, Bengaluru |
| Bharathi Nagar | Near Mark Circle, Frazer Town, Bengaluru |
| Byappanahalli | Near Gopalan Signature Mall, Swamy Vivekananda Road, Rahat Bagh, Nagavarapalya, Bengaluru |
| Commercial Street | Commercial Street, Tasker Town, Shivaji Nagar, Bengaluru |
| D.J Halli | Shampura Main Rd, Dr. Ambedkar Nagar, Kaval Bairasandra, Bengaluru |
| Halsoor | Ground Floor, Swami Vivekananda Rd, Cambridge Layout, Jogupalya, Bengaluru |
| Hennuru | Service Rd, Balachandra Layout, Babusabpalya, Hennur Gardens, Bengaluru |
| Indira Nagar | Swami Vivekananda Rd, Binnamangala, Hoysala Nagar, Indiranagar, Bengaluru |
| J.B Nagar | Sector 12, Jeevan Bima Nagar, Bengaluru 560075 |
| K.G Halli | Arabic College Post, Nagawara Main Rd, Vinobha Nagar, Kadugondanahalli, Bengaluru |
| Pulakeshi Nagar | MM Road, near BBMP Help Centre, Pulikeshi Nagar, Bengaluru |
| Ramamurthy Nagar | Kempe Gowda Underpass Rd, East of NGEF Layout, Dooravani Nagar, Bengaluru |
| Shivaji Nagar | HKP Road, Sulthangunta, Shivaji Nagar, Bengaluru |
| Women Police Station (East) | Shivaji Nagar, Bengaluru |

### Central Zone
| Station | Address |
|---|---|
| Ashoknagar | Commissariat Rd, Ashok Nagar, Bengaluru |
| Cubbon Park | VV Towers, ground floor, Dr Ambedkar Rd, Bengaluru |
| Halasoor Gate | Corporation Circle, Cubbonpete, Nagarathpete, Bengaluru |
| High Ground | Millers Rd, Vasanth Nagar, Bengaluru |
| S.J Park | 391, Kumbaragundi Rd, behind Shiva Talkies, Kalasipalyam New Extension, Bengaluru |
| S.R Nagar | 16th Cross, 4th Main Road, Mission Road, Sampangi Rama Nagar, Bengaluru |
| Sadashiva Nagar | 11th Cross Rd, Sadashiva Nagar, Bengaluru |
| Seshadripuram | SC Road, Seshadripuram, Bengaluru |
| Vidhana Soudha | Ambedkar Veedhi, Sampangi Rama Nagar, Bengaluru |
| Viveknagar | Ejipura Main Road, Vivek Nagar, Bengaluru |
| Vyalikaval | 2nd Main Road, Vyalikaval, Bengaluru |
| Wilson Garden | Siddaiah Rd, Vinayaka Nagar, NGO Colony, Wilson Garden, Bengaluru |

### West Zone
| Station | Address |
|---|---|
| Annapoorneshwari | 10 Block, 2nd Stage, Nagarbhavi, Bengaluru |
| Basaveshwara Nagar | 1st Cross Rd, Basaveshwar Nagar, Bengaluru |
| Byatarayanapura | MM Rd, Byatarayanapura, Banashankari, Bengaluru |
| Chamarajpet | 5th Main Rd, Chamrajpet, Bengaluru |
| Chandra Layout | Basaveshawara HBCS Layout 2nd Stage, Chandra Layout, Attiguppe, Bengaluru |
| City Market | 383 Avenue Road, City Market, Mamulpet, Chickpet, Bengaluru |
| Cottonpete | 149, Cottonpet Main Rd, Subhash Nagar, Cottonpete, Bengaluru |
| J.J.Nagar | Jagajeevanram Nagar, Bengaluru |
| Jnanabharathi | Gnana Bharathi University Campus, Mariyappana Palya, Bengaluru |
| Kempapura Agrahara | BBMP Building, 2nd Cross Road, Magadi Road, Bengaluru |
| Kalasipalya | Kalasipayam Main Road, Kalasipalya, Bengaluru |
| Kamakshipalya | Magadi Main Rd, KHB Colony, Vijayanagar, Bengaluru |
| Kengeri | Mysore Road, Shirke Layout, Kengeri Satellite Town, Bengaluru |
| Magadi Road | Magadi Main Rd, Police Quarters, Rajajinagar, Bengaluru |
| R.R.Nagar | Raja Rajeshwari Nagar, Ideal Township, Bengaluru |
| Upparpete | Danvanthri Road, Majestic, Bengaluru |
| Vijayanagar | Service Rd, SBI Staff Colony, Hoshalli Extension, Vijayanagar, Bengaluru |

### South Zone
| Station | Address |
|---|---|
| Banashankari | 9th Main Road Thyagaraj Nagar, Banashankari Stage II, Bengaluru |
| Basavanagudi | Krishna Rajendra Rd, Near Krishna Rao Park, Basavanagudi, Bengaluru |
| Basavanagudi Women PS | Basavanagudi, Bengaluru |
| C.K Achukattu | 3rd Cross Road, 9th Main Rd, Banashankari, Bengaluru |
| Girinagar | #99/G, 6th Main Road, BSK 3rd Stage, Hosakerehalli Layout, Bengaluru |
| Hanumanthanagar | Ashok Nagar, Banashankari Stage I, Bengaluru |
| J.P Nagar | JP Nagar, R.K Colony, Bengaluru |
| Jayanagar | 30th Cross Road, 4th Block, Jayanagar, Bengaluru |
| K.G Nagar | Gavipuram Guttahalli, Kempegowda Nagar, Bengaluru |
| K.S Layout | 1755, 14th Main Rd, 1st Stage, Kumaraswamy Layout, Bengaluru |
| Konanakunte | 144, Amruth Nagar Main Road, Anjanadri Layout, Konanakunte, Bengaluru |
| Puttenahalli | KR Layout, J. P. Nagar, Bengaluru |
| Shankarapuram | Shankar Mutt Main Road, Sankarapuram, Bengaluru |
| Siddapura | 3, 1st Main Rd, 1st Block, Jaya Nagar East, Bengaluru |
| Subramanyapura | Subramanyapura Main Rd, Uttarahalli Hobli, Bengaluru |
| Talaghattapura | Kanakapura Rd, near Bus Stop, Talaghattapura, Bengaluru |
| V. V. Puram | Albert Victor Road, Near Vani Vilas Hospital, Chamarajpet, Bengaluru |
| Victoria Hospital | New Tharagupet, Bengaluru |

### North-East Zone
| Station | Address |
|---|---|
| Amruthahalli | Amruth Nagar Main Rd, Sector B, Amruthnagar, Bengaluru |
| Bagaluru | Bagalur Colony, BEML Layout, Razack Palya, Bengaluru |
| Chikkajala | Chikkajala, Bengaluru |
| Devanahalli | Devanahalli, Karnataka 562110 |
| International Airport | Kempegowda Int'l Airport Rd, Hunachur, Bengaluru |
| Kodigehalli | BB Nagar, Koti Hosahalli, Bengaluru |
| Kothanuru | 560077, Geddalahalli, Rammana Layout, Bengaluru |
| Sampigehalli | R.K. Hegde Nagar, Bengaluru |
| Vidyaranyapura | BEL Layout 6th Block, Vidyaranyapura, Bengaluru |
| Yelahanka New Town | 3rd B Cross Road, Yelahanka New Town, Bengaluru |
| Yelahanka | Ambedkar Colony, Yelahanka New Town, Bengaluru |

### North Zone
| Station | Address |
|---|---|
| Bagalagunte | 4th A Cross Rd, MEI Employees Housing Colony, Bengaluru |
| Gangammanagudi | Abbigere Industrial Area, Sanjaynagara, Bengaluru |
| Hebbala | Bellary Rd, Ayyappa Layout, Hebbal, Bengaluru |
| J.C Nagar | Jayamahal, Bengaluru |
| Jalahalli | HMT Main Rd, Jalahalli Village, Bengaluru |
| Mahalakshmi Layout | 109, 2nd Cross Road, Bovipalya, Mahalakshmipuram, Bengaluru |
| Malleshwaram | 3, 5th Cross, near KC General Hospital, Malleshwaram, Bengaluru |
| Nandini Layout | ZMF-26, Nandini Layout Main Rd, Bengaluru |
| Peenya | Padarayanapalya, Second Cross, Peenya Industrial Area, Bengaluru |
| R.M.C Yard | 1, APMC Yard, Yesvantpur Industrial Suburb, Bengaluru |
| R.T Nagar | Dinnur Main Rd, P&T Colony, RT Nagar, Bengaluru |
| Rajagopal Nagar | 137, Rajagopalanagar Main Road, 3rd Cross KG Nagar, Laggere, Bengaluru |
| Rajajinagar | 12th Main Road, Rajajinagar, Bengaluru |
| Sanjayanagar | Sanjay Nagar Main Rd, Bengaluru |
| Soladevanahalli | SH 39, Defence Colony, Bengaluru |
| Srirampura | No 47, 9th Main Rd, Dayananda Nagar, Srirampura, Bengaluru |
| Subramanya Nagar | 67, Dr Rajkumar Rd, E Block, 2nd Stage, Rajajinagar, Bengaluru |
| Yeshwanthapura | 9th Cross Road, Mahalakshmi Layout, Ashokapuram, Bengaluru |

### South-East Zone
| Station | Address |
|---|---|
| Adugodi | Near Forum Mall, Adugodi, Bengaluru |
| Bandepalya | Sector 3, HSR Layout, Bengaluru |
| Begur | Begur Main Rd, Vishwapriya Nagar, Begur, Bengaluru |
| Bommana Halli | NGR Layout, Roopena Agrahara, Bommanahalli, Bengaluru |
| Electronic City | 2nd Cross Road, Indra Nagar, Electronic City, Bengaluru |
| H.S.R Layout | 27th Main Rd, 1st Sector, HSR Layout, Bengaluru |
| Hulimavu | Meenakshi Temple Road, Main Bus Stop, Hulimavu, Bengaluru |
| Koramangala | No.8/A, 20th Main Rd, 6th Block, Koramangala, Bengaluru |
| Madivala | Madiwala Rd, Santhosapuram, 1st Block Koramangala, Bengaluru |
| Mico Layout | 16 Main, 2nd Stage, Lakshmi Layout, EWS Colony, BTM Layout, Bengaluru |
| Parappana Agrahara | Jail Road, opposite Central Jail, Sai Sree Layout, Bengaluru |
| Suddaguntanapalya | 42, 4th Main Rd, K.M.Layout, Balaji Nagar, S.G. Palya, Bengaluru |
| Thilakanagar | Swagath Rd, 4th T Block East, Jayanagar 3rd Block East, Bengaluru |

### Whitefield Zone
| Station | Address |
|---|---|
| K.R.Puram | Old Madras Rd, opp. Sri Ram Hospital, Nisarga Layout, Devasandra, Bengaluru |
| Mahadevapura | Whitefield Main Rd, beside Singayyanapalya Bus Stop, Bengaluru |
| Kadugodi | Opposite BMTC Bus Stand, Kadugodi Colony, Kadugodi, Bengaluru |
| White Field | Whitefield Main Rd, beside Prestige White Meadows, Sathya Sai Layout, Bengaluru |
| Bellandur | 37, Marathahalli–Sarjapur Rd, Amblipura, PWD Quarters, 1st Sector, Bellandur, Bengaluru |
| H.A.L | Sector 3, Marathahalli, Bengaluru |
| Marathahalli | 88, Marathahalli–Sarjapur Outer Ring Road, Kadubeesanahalli, Bengaluru |
| Varthur | Varthur Road, Market, Near, Varthur, Karnataka |

**Not covered above (marked as separately maintained units, not itemized):** 42+ Traffic Police Stations, CEN (Cyber/Economic/Narcotics) stations, Central Crime Branch (CCB). Contact `bcp.gov.in` if these are needed for the dashboard.

---

## District 2: Mysuru (Mysuru City Police — 17 stations, 3 ACP zones)

*Source: findeasy.in / Mysuru City Police public contact list. Zones: Devaraj, Narasimharaja, Krishnaraja.*

| Station | Address |
|---|---|
| Alanahalli | No 71, SB Jayarama Extension, Alanahalli, near Devegowda Circle, Bannur Ring Road, Mysuru 570026 |
| Ashokapuram | Adichunchanagiri Road, Kuvempunagara, Mysuru 570023 |
| Devaraja | Dhanvanthri Road, K.R. Hospital Compound, Devaraja Mohalla, Mysuru 570001 |
| Hebbal | #18, beside Shubhodini Kalyana Mantap, Hudco Layout, Hebbal 3rd Stage, Mysuru |
| Jayalakshmipuram | Behind Iswariya Petrol Bunk, Vijayanagara 3rd Stage, Site No. CS 1, Mysuru 570017 |
| Krishnaraja | M.G. Road, K.R. Mohalla, Mysuru 570004 |
| Kuvempunagara | Dakshineshwara Main Road, near Church, Ramakrishna Nagar, Mysuru 570022 |
| Laxmipuram | J.L.B Road, Laxmipuram, Mysuru 570004 |
| Mandi | Kabeer Road, Mandi Mohalla, Mysuru 570021 |
| Metagally | K.R.S Road, Metegally, Mysuru 570016 |
| Narasimharaja | Rajendra Nagara, Panchamuku Ganapathi Temple Road, Mysuru 570007 |
| Nazarbad | Nazarbad Circle, M.M. Road, Nazarbad Mohalla, Mysuru 570010 |
| Saraswathipuram | Sahukar Chennaiah Road, S.S. Puram, Mysuru 570009 |
| Udayagiri | Mahadevapura Main Road, Shanthi Nagar, Mysuru 570019 |
| Vanivilasa Puram | Temple Road, V.V. Mohalla, Mysuru 570002 |
| Vidyaranyapuram | J.P. Nagar Main Road, J.P. Nagar, Mysuru 570008 |
| Vijayanagar | 23rd Cross, Vijayanagara 2nd Stage, Mysuru 570017 |
| Women Police Station | Hamilton Building, Nehru Circle, Lashkar Mohalla, Mysuru 570001 |

**Zone HQs:** ACP Devaraja — Hamilton Building, Lashkar Mohalla, Mysuru 570001. ACP Krishnaraja — J.L.B Road, Laxmipuram, Mysuru 570004. ACP Narasimharaja — Ashoka Road, Lashkar Mohalla, Mysuru.

**Not covered:** Mysuru Rural sub-division stations (KR Nagar, Hunsur, Periyapatna, H.D. Kote, Nanjangud, T.Narasipura circles) — these fall in Mysuru district but outside city limits; flag if you need the rural taluk stations too. 7 Traffic PS also not itemized.

---

## District 3: Hubballi-Dharwad (Hubballi-Dharwad City Police — twin-city force)

*Source: Hubballi-Dharwad City Police public contact list.*

| Station | Address | Phone |
|---|---|---|
| Hubli Town | Broadway, near Duragad Bail, Hubballi | 0836-2233540 |
| Bendigeri | Settlement, Hubballi | 0836-2233526 |
| Ghantikeri | Javali Sal, Hubballi | 0836-2233527 |
| Kasabapet | Near Sadarsofa Bridge, Kasaba Main Road, Old Hubballi | 0836-2233536 |
| Old Hubli | Near Indipump Circle, Old Hubballi | 0836-2233541 |
| Vidyanagar | Vidyanagar, Hubballi | 0836-2233516 |
| Gokul Road | Near New Bus Stand, Hubballi | 0836-2233525 |
| Hubli Sub-Urban | Near Brindavan Circle, Lamington Road, Hubballi | 0836-2233517 |
| Kamaripet | Near Irkal Petrol Pump, PB Road, Hubballi | 0836-2233519 |
| Keshwapur | Near Ramesh Bhavan, Keshwapur, Hubballi | 0836-2233518 |
| Women Police Station | Near Brindavan Circle, Lamington Road, Hubballi | 0836-2233514 |
| APMC Navanagar | Navanagar, Hubballi | 0836-2233492 |
| Ashok Nagar | Vishweshwar Nagar, Hubballi | 0836-2233490 |
| Dharwad Town | Near Old Bus Stand, Dharwad | 0836-2233512 |
| Vidyagiri | Kalagatagi Road, Rajatgiri, Dharwad | 0836-2233513 |
| Dharwad Sub-Urban | Near Mental Hospital, Dharwad | 0836-2233511 |
| Dharwad Traffic | Beside Tahasildar Office, near Basel Mission English Medium School, Dharwad | 0836-2233542 |
| North Traffic | Near New Cotton Market, Hubballi | 0836-2233515 |
| South Traffic | Near New English Medium School, PB Road, Hubballi | 0836-2233538 |
| East Traffic | Solapur Road, Keshwapur, Hubballi | 0836-2233543 |
| Cyber Crime PS (CEN) | Hubballi-Dharwad City | 0836-2233567 |

**Rural taluk stations in Dharwad district (Kundgol, Gudageri, Navalgund, Kalghatgi, Annigeri, Alnavar) are separately administered under Dharwad District (Rural) Police and are not itemized here** — flag if the dashboard needs full-district rural coverage rather than just the twin-city force.

---

## District 4: Mangaluru / Dakshina Kannada (Mangaluru City Police + District Rural)

*Source: doobigo.com directory + dkpolice.karnataka.gov.in circle listing (official site blocks automated fetch, so cross-checked against directory aggregators). Addresses here are less complete than other districts — many stations only had locality names, not full street addresses, in available sources.*

### Mangaluru City Police
| Station | Locality / Address | Coordinates (source-linked) |
|---|---|---|
| Mangalore North | Near A B Shetty Circle, Pandeshwar, Mangaluru 575001 | — |
| Mangalore South | Near Forum Mall, Pandeshwar, Mangaluru 575001 | 12.8561, 74.8393 |
| Mangalore East | Kavoor, Mangaluru 575015 | — |
| Urwa | Near Urwa Store Market, Ashok Nagar, Mangaluru 575006 | — |
| Barke | Bunder, Mangaluru 575002 | — |
| Mangalore West | Bejai Main Rd, Bejai, Mangaluru 575004 | — |
| Panambur | Panambur, Mangaluru | — |
| Bajpe | Bajpe, Mangaluru | — |
| Kavoor | Kavoor, Mangaluru 575015 | — |
| Konaje | Konaje, Mangaluru | — |
| Surathkal | NH 66, Surathkal, near Govinda Dasa College, Mangaluru | — |
| Ullal | Vidyaranyanagar, Ullal, Mangaluru 575020 | — |

### Dakshina Kannada District (Rural)
| Station | Locality |
|---|---|
| Mulki | Mulki |
| Sullia | Sullia |
| Puttur | Puttur |
| Belthangady | Belthangady |
| Bantwal | Bantwal |
| Vitla | Vitla (Bantwal taluk) |
| Uppinangady | Uppinangady |
| Kadaba | Kadaba |
| Subramanya | Subramanya |
| Venur | Venur |
| Moodabidri | Moodabidri |

**District police control room:** Near A.B. Shetty Circle, Pandeshwar, Mangaluru 575001, general enquiry 0824-2220535.

**Gap to flag:** unlike Bengaluru/Mysuru/Hubballi-Dharwad, I could not find a single aggregator page with full street addresses for every Mangaluru-area station — several rows above only have locality names. I'd recommend cross-checking these against Google Maps directly before ingesting into the dashboard, or letting me search per-station if you need it filled in.

---

## District 5: Belagavi (Belagavi City Police — 3 Sub-Divisions + Traffic)

*Source: findeasy.in / Belagavi City Police structure. Addresses were not published on the source page — station names and sub-division groupings only. This is the weakest-sourced district in this file; treat as a to-do list rather than a finished reference.*

### Market Sub-Division
- Market Police Station
- APMC Police Station
- Mamaruti Police Station
- Shahapur Police Station

### KBPS Sub-Division
- Khade Bazar Police Station
- Udyam Bagh Police Station
- Camp Police Station
- Tilakwadi Police Station
- Women Police Station

### Belagavi Rural Sub-Division
- Belagavi Rural Police Station
- Kakti Police Station
- Hirebagewadi Police Station
- Suvarna Soudha Police Station
- Marihal Police Station
- Sambra Out Post

### Traffic
- Traffic North Police Station
- Traffic South Police Station

**Known addresses (from spot searches):**
- CEN Police Station — Old PB Road, Belgaum Fort, Belagavi 590016
- Citizens' Call Centre — 0831-2424566

**This district needs a follow-up pass** — I'd suggest either fetching `belagavicitypolice.in` directly (site wasn't in my search results so I couldn't reach it this round) or having me do a second, deeper search focused just on Belagavi if it's a priority district for the dashboard.

---

## Geocoding script (`geocode_stations.py`)

Run this yourself against a CSV export of the tables above (columns: `name,address`) to fill in the coordinate gaps. Free, no API key, but rate-limited to 1 req/sec per Nominatim's usage policy — be patient with ~250 rows.

```python
import csv
import time
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "AshenProtocol-KarnatakaPoliceGeocoder/1.0 (research use)"}

def geocode(query: str):
    params = {"q": query, "format": "json", "limit": 1, "countrycodes": "in"}
    r = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
    r.raise_for_status()
    results = r.json()
    if results:
        return float(results[0]["lat"]), float(results[0]["lon"])
    return None, None

def main(in_path: str, out_path: str):
    with open(in_path, newline="", encoding="utf-8") as f_in, \
         open(out_path, "w", newline="", encoding="utf-8") as f_out:
        reader = csv.DictReader(f_in)
        fieldnames = reader.fieldnames + ["lat", "lon"]
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            query = f'{row["name"]} Police Station, {row["address"]}, Karnataka, India'
            lat, lon = geocode(query)
            row["lat"] = lat
            row["lon"] = lon
            writer.writerow(row)
            print(f'{row["name"]}: {lat}, {lon}')
            time.sleep(1.1)  # respect Nominatim's 1 req/sec limit

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python geocode_stations.py input.csv output.csv")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
```

**Note:** Nominatim's free tier is for light/non-commercial use per their usage policy — fine for building/testing Ashen Protocol, but if this goes into a production deployment at scale, consider Google Maps Geocoding API or Mapbox instead (both have generous free tiers and are more reliable for Indian addresses with "near X" style descriptions).

---

## Summary counts

| District | Stations listed | Addresses complete | GPS coords available |
|---|---|---|---|
| Bengaluru Urban (City Police) | 108 | Yes | No — needs geocoding |
| Mysuru (City Police) | 18 | Yes | No — needs geocoding |
| Hubballi-Dharwad | 21 | Yes | No — needs geocoding |
| Mangaluru / Dakshina Kannada | 23 | Partial | 1 verified |
| Belagavi | 15 | No (names only) | No |

**Total: ~185 stations catalogued**, all names sourced from official/directory listings, none of the coordinates fabricated. Belagavi and Mangaluru need a follow-up pass if you want them at the same fidelity as the other three.
