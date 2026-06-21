import subprocess
import sys

print("Executing git push origin main...")
res = subprocess.run(["git", "push", "origin", "main"], cwd="/Users/mac/Downloads/Code/Satya/Satya", capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
sys.exit(res.returncode)
