import shutil
import os

src = r"C:\Users\Yoooo!\.gemini\antigravity-ide\brain\6b8faeaa-009a-4ddd-8ff3-0ab93ade9759\ashen_social_preview_1785084137506.png"
dst = os.path.join(os.path.dirname(__file__), "docs", "assets", "ashen_social_preview.png")

if os.path.exists(src):
    shutil.copy(src, dst)
    print(f"Successfully copied PNG to {dst}")
else:
    print("Source image not found.")
