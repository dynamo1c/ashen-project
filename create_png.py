from PIL import Image, ImageDraw, ImageFont
import os

width = 1280
height = 640

# Create image with bg color #13151A
img = Image.new('RGB', (width, height), color='#13151A')
draw = ImageDraw.Draw(img)

# Try loading font or use default
try:
    font_large = ImageFont.truetype("arial.ttf", 48)
    font_medium = ImageFont.truetype("arial.ttf", 20)
    font_small = ImageFont.truetype("arial.ttf", 15)
    font_mono = ImageFont.truetype("cour.ttf", 16)
except Exception:
    font_large = font_medium = font_small = font_mono = ImageFont.load_default()

# Background grid lines
grid_color = '#1C1E24'
draw.line([(0, 80), (1280, 80)], fill=grid_color, width=1)
draw.line([(0, 560), (1280, 560)], fill=grid_color, width=1)
draw.line([(120, 0), (120, 640)], fill=grid_color, width=1)
draw.line([(1160, 0), (1160, 640)], fill=grid_color, width=1)

# Top Bar Chrome
draw.rectangle([(50, 25), (1230, 60)], fill='#0F1114', outline='rgba(255,255,255,0.06)')
draw.text((70, 33), "SYS // ASHEN_PROTOCOL_KSP_DATATHON_2026", fill='#4B5261', font=font_mono)
draw.text((820, 33), "KARNATAKA STATE POLICE · OFFICIAL SUBMISSION", fill='#4B5261', font=font_mono)
draw.ellipse([(1200, 38), (1210, 48)], fill='#3A8C5C')

# Main Hero Card
draw.rectangle([(160, 110), (1120, 530)], fill='#1C1E24', outline='#2A2E39', width=1)

# Title & Subtitle
draw.text((210, 150), "⚔️ ASHEN PROTOCOL", fill='#C8CDD6', font=font_large)
draw.text((212, 215), "PALANTIR GOTHAM OPERATIONAL CRIME INTELLIGENCE PLATFORM", fill='#6B7280', font=font_mono)

# Tagline
draw.text((212, 260), "High-density decision-support system fusing 75,000 FIR Records, D3 accomplice graphs,", fill='#9CA3AF', font=font_medium)
draw.text((212, 290), "Leaflet GIS heatmaps, and Cerebras 120B multi-turn AI Command Copilot.", fill='#9CA3AF', font=font_medium)

# Metric Boxes
metrics = [
    ("INCIDENT RECORDS", "75,000 FIRs"),
    ("OFFENDER PROFILES", "100,000 Records"),
    ("AI COPILOT", "Cerebras 120B"),
    ("INFRASTRUCTURE", "Zoho Catalyst")
]

x_start = 212
for label, val in metrics:
    draw.rectangle([(x_start, 340), (x_start + 195, 420)], fill='#24272E', outline='#3A4050', width=1)
    draw.text((x_start + 15, 355), label, fill='#4B5261', font=font_mono)
    draw.text((x_start + 15, 385), val, fill='#C8CDD6', font=font_medium)
    x_start += 210

# Bottom Bar Inside Card
draw.rectangle([(212, 450), (1068, 490)], fill='#0F1114')
draw.text((230, 462), "IDEOLOGY: HUMAN-IN-THE-LOOP DECISION SUPPORT · ZERO PLACEHOLDERS", fill='#4B5261', font=font_mono)
draw.rectangle([(940, 458), (1050, 482)], fill='#2D1B1B', outline='#C64A4A')
draw.text((955, 463), "SUBMISSION", fill='#C64A4A', font=font_mono)

# Bottom Status
draw.rectangle([(50, 580), (1230, 610)], fill='#0F1114')
draw.text((70, 590), "KSP DATATHON 2026 // TEAM ASHEN PROTOCOL", fill='#4B5261', font=font_mono)
draw.text((850, 590), "LICENSED FOR JUDGING REVIEW & KSP EVALUATION", fill='#4B5261', font=font_mono)

output_path = os.path.join(os.path.dirname(__file__), "docs", "assets", "ashen_social_preview.png")
img.save(output_path, "PNG")
print(f"Generated {output_path}")
