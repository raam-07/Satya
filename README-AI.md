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
