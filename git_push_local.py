import subprocess
import os

repo = os.path.dirname(os.path.abspath(__file__))
commit_msg = "feat: Palantir Gotham UI refactoring, Crime Anomaly Radar engine, resizable panels & SPA route fixes"

print(f"[*] Processing repository at: {repo}")

def run_git(args):
    res = subprocess.run(["git"] + args, cwd=repo, capture_output=True, text=True)
    print(f"[>] git {' '.join(args)}")
    if res.stdout and res.stdout.strip():
        print("STDOUT:\n" + res.stdout.strip())
    if res.stderr and res.stderr.strip():
        print("STDERR:\n" + res.stderr.strip())
    return res

run_git(["status", "-s"])
print("[*] Staging changes...")
run_git(["add", "-A"])

print("[*] Committing changes...")
run_git(["commit", "-m", commit_msg])

print("[*] Checking remote...")
remote_res = run_git(["remote", "-v"])

if remote_res.stdout and "origin" in remote_res.stdout:
    print("[*] Pushing to GitHub...")
    push_res = run_git(["push", "origin", "main"])
    if push_res.returncode != 0:
        print("[*] Retrying push with branch HEAD:main...")
        run_git(["push", "origin", "HEAD:main"])
        run_git(["push", "origin", "HEAD:master"])
else:
    print("[-] No git remote found for repository.")
