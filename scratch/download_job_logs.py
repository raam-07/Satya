import urllib.request
import json
import urllib.error
import os

# Read PAT from parent .env
pat = ""
env_path = "/Users/mac/Downloads/Code/Satya/.env"
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            if line.strip().startswith("GITHUB_PAT_ALT="):
                pat = line.split("=")[1].strip()

headers = {
    "Authorization": f"token {pat}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Antigravity-AI-Agent"
}

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, msg, headers, fp)

def fetch_logs(job_id):
    url = f"https://api.github.com/repos/raam-07/SATYA-NEWS-CLASSIFIER/actions/jobs/{job_id}/logs"
    opener = urllib.request.build_opener(NoRedirectHandler)
    req = urllib.request.Request(url, headers=headers)
    
    redirect_url = ""
    try:
        opener.open(req)
    except urllib.error.HTTPError as e:
        if e.code in [301, 302, 307, 308]:
            redirect_url = e.headers.get("Location")
        else:
            print(f"Failed to fetch redirect URL: HTTP {e.code}")
            return None
    
    if not redirect_url:
        print("No redirect URL found.")
        return None
    
    req_redirect = urllib.request.Request(redirect_url)
    req_redirect.add_header("User-Agent", "Antigravity-AI-Agent")
    
    try:
        with urllib.request.urlopen(req_redirect) as response:
            return response.read().decode()
    except Exception as e:
        print(f"Failed to fetch logs from storage: {e}")
        return None

def main():
    run_id = "29090078846"
    print(f"Fetching job details for Run ID {run_id}...")
    
    jobs_url = f"https://api.github.com/repos/raam-07/SATYA-NEWS-CLASSIFIER/actions/runs/{run_id}/jobs"
    req_jobs = urllib.request.Request(jobs_url, headers=headers)
    try:
        with urllib.request.urlopen(req_jobs) as r_jobs:
            jobs_data = json.load(r_jobs)
            for job in jobs_data.get("jobs", []):
                print(f"Job: {job['name']} | Status: {job['status']} | Conclusion: {job['conclusion']} | ID: {job['id']}")
                log_data = fetch_logs(job["id"])
                if log_data:
                    lines = log_data.split("\n")
                    print("\n--- Last 50 lines of logs ---")
                    for line in lines[-50:]:
                        print(line)
                else:
                    print("No logs retrieved.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
