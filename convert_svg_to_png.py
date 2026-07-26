from PIL import Image, ImageDraw, ImageFont
import os

width = 1280
height = 640

# Create canvas with bg #13151A
img = Image.new('RGB', (width, height), color='#13151A')
draw = ImageDraw.Draw(img)

# Try fonts
try:
    font_title = ImageFont.truetype("arial.ttf", 44)
    font_subtitle = ImageFont.truetype("cour.ttf", 13)
    font_tagline = ImageFont.truetype("arial.ttf", 16)
    font_mono = ImageFont.truetype("cour.ttf", 12)
    font_card_title = ImageFont.truetype("arial.ttf", 14)
    font_val = ImageFont.truetype("cour.ttf", 16)
except Exception:
    font_title = font_subtitle = font_tagline = font_mono = font_card_title = font_val = ImageFont.load_default()

# Background Grid
grid_color = '#1C1E24'
draw.line([(0, 50), (1280, 50)], fill=grid_color, width=1)
draw.line([(0, 590), (1280, 590)], fill=grid_color, width=1)
draw.line([(120, 0), (120, 640)], fill=grid_color, width=1)
draw.line([(1160, 0), (1160, 640)], fill=grid_color, width=1)

# Top Bar
draw.rectangle([(30, 15), (1250, 43)], fill='#0F1114', outline='#2A2E39')
draw.text((50, 23), "SYS // ASHEN_PROTOCOL_KSP_DATATHON_2026", fill='#4B5261', font=font_mono)
draw.text((890, 23), "KARNATAKA STATE POLICE · OFFICIAL SUBMISSION", fill='#4B5261', font=font_mono)
draw.ellipse([(1231, 25), (1239, 33)], fill='#3A8C5C')

# Left Panel (Network Graph Scope)
draw.rectangle([(45, 95), (325, 565)], fill='#1C1E24', outline='#2A2E39')
draw.text((65, 115), "TACTICAL CO-OFFENDING GRAPH", fill='#4B5261', font=font_mono)

# Radar rings
draw.ellipse([(95, 235), (275, 415)], outline='#24272E', width=1)
draw.ellipse([(130, 270), (240, 380)], outline='#2E3340', width=1)
draw.ellipse([(155, 295), (215, 355)], outline='#3A4050', width=1)
draw.line([(185, 205), (185, 445)], fill='#24272E', width=1)
draw.line([(65, 325), (305, 325)], fill='#24272E', width=1)

# Network Nodes
draw.line([(140, 280), (240, 300)], fill='#C64A4A', width=2)
draw.line([(240, 300), (210, 390)], fill='#4B5261', width=1)
draw.line([(140, 280), (210, 390)], fill='#C64A4A', width=2)

draw.ellipse([(126, 266), (154, 294)], fill='#24272E', outline='#C64A4A', width=2)
draw.text((134, 274), "N1", fill='#C64A4A', font=font_mono)

draw.ellipse([(228, 288), (252, 312)], fill='#24272E', outline='#B8862A', width=2)
draw.text((234, 294), "N2", fill='#B8862A', font=font_mono)

draw.ellipse([(199, 379), (221, 401)], fill='#24272E', outline='#6B7280', width=1)
draw.text((204, 384), "N3", fill='#C8CDD6', font=font_mono)

# Left Panel Card
draw.rectangle([(60, 480), (310, 545)], fill='#24272E', outline='#3A4050')
draw.text((73, 492), "SYNDICATE TRACE", fill='#4B5261', font=font_mono)
draw.text((73, 515), "Koramangala PS Zone", fill='#C8CDD6', font=font_val)
draw.rectangle([(235, 495), (295, 517)], fill='#2D1B1B', outline='#C64A4A')
draw.text((243, 499), "LINKED", fill='#C64A4A', font=font_mono)

# Center Panel (Branding)
draw.text((350, 140), "⚔️ ASHEN PROTOCOL", fill='#C8CDD6', font=font_title)
draw.text((352, 195), "PALANTIR GOTHAM-INSPIRED OPERATIONAL CRIME INTELLIGENCE PLATFORM", fill='#6B7280', font=font_subtitle)

draw.text((352, 240), "High-density decision-support system built for Karnataka State Police (KSP Datathon 2026).", fill='#9CA3AF', font=font_tagline)
draw.text((352, 268), "Fusing 75k FIR Records, D3.js accomplice networks, Leaflet GIS, and Cerebras AI Copilot.", fill='#9CA3AF', font=font_tagline)

# Center Metric Grid (4 cards)
metric_cards = [
    (350, 310, "INCIDENT RECORDS", "75,000 FIR Logs"),
    (640, 310, "OFFENDER PROFILES", "100,000 Suspects"),
    (350, 415, "COGNITIVE AI ENGINE", "Cerebras 120B / Gemini"),
    (640, 415, "CLOUD INFRASTRUCTURE", "Zoho Catalyst Serverless")
]

for mx, my, mtitle, mval in metric_cards:
    draw.rectangle([(mx, my), (mx + 270, my + 85)], fill='#24272E', outline='#3A4050')
    draw.text((mx + 18, my + 18), mtitle, fill='#4B5261', font=font_mono)
    draw.text((mx + 18, my + 45), mval, fill='#C8CDD6', font=font_val)

# Ideology footnote
draw.rectangle([(350, 520), (910, 560)], fill='#0F1114', outline='#2A2E39')
draw.text((370, 534), "OPERATIONAL MODEL: HUMAN-IN-THE-LOOP DECISION SUPPORT", fill='#4B5261', font=font_mono)

# Right Panel (Risk Forecast)
draw.rectangle([(935, 95), (1235, 565)], fill='#1C1E24', outline='#2A2E39')
draw.text((955, 115), "LIVE DISTRICT FORECAST", fill='#4B5261', font=font_mono)

districts = [
    (955, 150, "Bengaluru Urban", "HOTSPOT // Z-SCORE +3.42", "CRITICAL", "#C64A4A", "#2D1B1B"),
    (955, 240, "Hubballi-Dharwad", "ELEVATED // Z-SCORE +1.85", "ELEVATED", "#B8862A", "#2B241B"),
    (955, 330, "Mangaluru PS Zone", "BASELINE // Z-SCORE +0.41", "NOMINAL", "#3A8C5C", "#1B2B21"),
    (955, 420, "Belagavi Division", "BASELINE // Z-SCORE +0.12", "NOMINAL", "#3A8C5C", "#1B2B21")
]

for dx, dy, dname, dsub, dbadge, dcolor, dbg in districts:
    draw.rectangle([(dx, dy), (dx + 260, dy + 75)], fill='#24272E', outline='#3A4050')
    draw.text((dx + 15, dy + 16), dname, fill='#C8CDD6', font=font_card_title)
    draw.text((dx + 15, dy + 42), dsub, fill='#4B5261', font=font_mono)
    draw.rectangle([(dx + 175, dy + 16), (dx + 245, dy + 40)], fill=dbg, outline=dcolor)
    draw.text((dx + 185, dy + 22), dbadge, fill=dcolor, font=font_mono)

# Bottom Status
draw.rectangle([(30, 598), (1250, 626)], fill='#0F1114', outline='#2A2E39')
draw.text((50, 606), "MODE: DECISION_SUPPORT_ONLY", fill='#4B5261', font=font_mono)
draw.text((350, 606), "DATASET: 75,000 FIRs (2023 NCRB BOUNDED DISTRIBUTIONS)", fill='#4B5261', font=font_mono)
draw.text((900, 606), "PROVENANCE: LIVE / MOCK TRANSPARENCY", fill='#4B5261', font=font_mono)

output_path = os.path.join(os.path.dirname(__file__), "docs", "assets", "ashen_social_preview.png")
img.save(output_path, "PNG")
print(f"Successfully generated high-res PNG at {output_path}")
