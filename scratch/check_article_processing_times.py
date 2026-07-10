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
            return None
    
    if not redirect_url:
        return None
    
    req_redirect = urllib.request.Request(redirect_url)
    req_redirect.add_header("User-Agent", "Antigravity-AI-Agent")
    
    try:
        with urllib.request.urlopen(req_redirect) as response:
            return response.read().decode()
    except Exception as e:
        return None

def main():
    job_id = "86353114808"
    log_data = fetch_logs(job_id)
    if log_data:
        lines = log_data.split("\n")
        print("Analysis of article processing times:")
        current_article = ""
        start_time = ""
        
        for line in lines:
            if "Classifying:" in line:
                print(line.strip())
            elif "Saved [" in line:
                print(line.strip())
            elif "Failed to classify" in line:
                print(line.strip())
            elif "Flag rejected" in line or "⚑ CIVIC FLAG" in line:
                print("  " + line.strip())
    else:
        print("Failed to fetch logs.")

if __name__ == "__main__":
    main()
