import os
import urllib.request
import json
import urllib.error
import time

# Read PAT from parent .env
pat = ""
env_path = "/Users/mac/Downloads/Code/Satya/.env"
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            if line.strip().startswith("GITHUB_PAT="):
                pat = line.split("=")[1].strip()

headers = {
    "Authorization": f"token {pat}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Antigravity-AI-Agent"
}

def get_active_runs():
    url = "https://api.github.com/repos/theyashsinghal/rephrased_news_articles/actions/runs?per_page=30"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            active = []
            for run in data.get("workflow_runs", []):
                if run["status"] in ["in_progress", "queued", "requested", "waiting"]:
                    active.append(run["id"])
            return active
    except Exception as e:
        print(f"Error fetching runs: {e}")
        return []

def cancel_run(run_id):
    url = f"https://api.github.com/repos/theyashsinghal/rephrased_news_articles/actions/runs/{run_id}/cancel"
    req = urllib.request.Request(url, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Successfully sent cancel request for Run ID {run_id}")
    except Exception as e:
        print(f"Error cancelling Run ID {run_id}: {e}")

def trigger_new_run():
    url = "https://api.github.com/repos/theyashsinghal/rephrased_news_articles/actions/workflows/rephrase_batch.yml/dispatches"
    body = {
        "ref": "main",
        "inputs": {
            "shard": "all"
        }
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            print("Successfully triggered a new parallel workflow run (inputs: shard=all)")
    except Exception as e:
        print(f"Error triggering new run: {e}")

def main():
    print("Finding active workflow runs...")
    active_ids = get_active_runs()
    if not active_ids:
        print("No active workflow runs found.")
    else:
        print(f"Found {len(active_ids)} active runs: {active_ids}")
        for r_id in active_ids:
            cancel_run(r_id)
        
        print("Waiting 5 seconds for cancellations to propagate...")
        time.sleep(5)
        
    print("Triggering new workflow dispatch...")
    trigger_new_run()

if __name__ == "__main__":
    main()
