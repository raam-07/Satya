# Satya System Architecture & AI Runbook

This repository is part of **Satya**, a platform designed for tracking political promises, analyzing news media, and maintaining data libraries.

---

## 1. Repository Layout

All Satya repositories are maintained as sister directories under the parent folder `/Users/mac/Downloads/Code/Satya/`. This layout keeps each repository independent in Git while providing full read/write context to AI agents within a single workspace.

```text
/Users/mac/Downloads/Code/Satya/            # Parent Workspace
  ├── Satya/                                # [This Repo] Frontend App (Next.js)
  ├── Satya-promise-tracker/                # Promise Extraction & Dynamic Status Evaluation
  ├── SATYA-NEWS-CLASSIFIER/                # Machine learning/LLM news ingestion & classification
  ├── satya-entity-library/                 # Tracked politicians and canonical entity mappings
  └── Satya-API/                            # Central backend API gateway and databases
```

---

## 2. Directory Matrix & Context

### A. Frontend Application (`Satya/`)
* **Path**: `../Satya` (Relative to workspace parent)
* **Purpose**: Next.js & TailwindCSS dashboard presenting active promises, entity profiles, and categorization logs.
* **Tech Stack**: Next.js, React, TailwindCSS, TypeScript.

### B. Promise Tracker (`Satya-promise-tracker/`)
* **Path**: `../Satya-promise-tracker`
* **Purpose**: Discovers new promises dynamically from classified news, checks evidence relevance using Gemma/Llama-CPP, and auto-suggests status (kept/broken/ongoing).
* **Tech Stack**: Python, Llama-CPP, gspread.

### C. News Classifier (`SATYA-NEWS-CLASSIFIER/`)
* **Path**: `../SATYA-NEWS-CLASSIFIER`
* **Purpose**: Classifies incoming raw news articles to identify political announcements and relevance to target entities.
* **Tech Stack**: Python, machine learning/text-classification pipelines.

### D. Entity Library (`satya-entity-library/`)
* **Path**: `../satya-entity-library`
* **Purpose**: Stores the canonical dictionary of politicians, aliases, stop-words, and mapping data to prevent hardcoding.
* **Tech Stack**: JSON, Python schemas.

### E. API Gateway (`Satya-API/`)
* **Path**: `../Satya-API`
* **Purpose**: Connects the frontend to databases, serves the Promise Tracker JSON outputs, and manages authentication/endpoints.
* **Tech Stack**: Node.js/Python, database connectors.

---

## 3. Strict AI Rules & Guidelines

1. **Zero Hardcoding**: Never hardcode names, categories, stop-words, or keywords in backend logic or data scripts. Load them dynamically from `satya-entity-library`.
2. **Path Constraints**: Do not search or modify files outside of the `/Users/mac/Downloads/Code/Satya/` directory tree.
3. **Vanilla Styling**: Prioritize clean vanilla CSS styles in frontend development unless TailwindCSS configurations are explicitly referenced.
4. **Command Approvals**: Explain the rationale behind any command execution *before* proposing or asking for terminal permission.

---

## Frontend Operations Runbook (PWA, caching, admin refresh)

### Service worker (`public/sw.js`)
- Provides faster home-screen / repeat launches by caching the app shell.
- **Safe by design**: HTML + API/data are always **network-first** (users can never get stuck on an old version); only content-hashed `/_next/static/*` assets are cache-first (a new deploy changes their filenames).
- **Kill switch — stale cache:** bump `CACHE_VERSION` in `public/sw.js` (e.g. `v1` → `v2`) and deploy. Every client wipes and rebuilds its cache on the next launch.
- **Fully remove the SW:** delete `public/sw.js` and the `<ServiceWorkerRegister />` line in `app/layout.tsx`. Existing installs self-unregister when `sw.js` starts 404ing.
- Only runs over **HTTPS** (won't register on local `http://`) — that's expected.
- **iOS caveat:** Apple evicts service workers aggressively, so cold boots after memory eviction still happen. The SW improves warm launches, it does not make iOS feel fully native.
- After deploying SW changes, remove + re-add the home-screen icon once to shed the pre-SW version.

### Feed performance (`components/HomeClient.tsx`)
- The feed renders 20 cards at a time and pages up. It fetches `FEED_LIMIT = 150` (not the full 500) — fetching 500 with every article's decompressed text froze phones.
- Offscreen cards use `content-visibility: auto` to skip paint work.

### Admin hard-refresh button (`/data?admin=true`)
- The button on the Data page is hidden for normal visitors and appears only with **`?admin=true`** in the URL.
- The admin check is **client-side** (reads `window.location.search`) because the Data page is statically cached — a server-side param check would always read empty.
- Clicking prompts for the **revalidation secret** (`REVALIDATE_SECRET`); the secret is never shipped in the page HTML. Use it to bust the server cache and see fresh DB changes without waiting out the cache window.

### Cache windows (`lib/api.server.ts`, page `revalidate`)
- **Timeline surfaces (list, event pages, story-so-far, sitemap): 3 days.** Bust instantly via the admin refresh button after a stitch / Doctor run / daily run.
- Feed, promises, minister/party pages: **15 minutes.**
