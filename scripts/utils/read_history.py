import subprocess
import os

cwd = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
try:
    print("--- Git Status ---")
    res = subprocess.run(["git", "status"], cwd=cwd, capture_output=True, text=True, check=True)
    print(res.stdout)

    print("--- Git Log ---")
    res2 = subprocess.run(["git", "log", "-n", "10", "--oneline", "functions/ashen_api/index.js"], cwd=cwd, capture_output=True, text=True, check=True)
    print(res2.stdout)
except Exception as e:
    print("Error:", e)
