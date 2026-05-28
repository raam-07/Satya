# Satya — Architectural & Feature Recommendations

This document outlines high-impact technical recommendations to improve backend pipeline efficiency, data integrity, AI processing, and frontend UI/UX presentation for the Satya platform.

---

## 1. Backend & Data Pipeline Optimizations

### A. Rate Limit & Google Sheets Fetch Optimization
Currently, the aggregator uses `sheet.col_values(1)` to fetch JSON strings. While functional, fetching column values column-by-column causes multiple sequential network calls under the hood, making the pipeline vulnerable to **Google Sheets API Rate Limits (Quota Exceeded / 500 errors)**.

* **Batch Fetching**: Replace cell-by-cell or column-by-column requests with a single batch fetch using `sheet.get_all_values()`. This fetches the entire table in one API request and parses columns in-memory.
* **Delta Syncing**: Keep track of the last processed row or timestamp in a local cache. Instead of reprocessing all 10,000+ entries every 2 hours, fetch only rows beyond the last processed row index.

```python
# Recommended optimization for fetch_articles:
def fetch_articles_optimized(sheet, last_processed_index=0):
    logging.info("Fetching classified articles in batch...")
    # Fetch all data in one network request
    all_rows = sheet.get_all_values()
    
    articles = []
    # Process only rows that are new
    for index, row in enumerate(all_rows[last_processed_index:], start=last_processed_index):
        cell_content = row[0]
        if not cell_content:
            continue
        try:
            article = json.loads(cell_content)
            article['row_index'] = index
            # Date parsing logic...
            articles.append(article)
        except json.JSONDecodeError:
            continue
    return articles
```

### B. Name Disambiguation & Alias Resolution
In Indian political reporting, ministers are often referred to by common surnames ("Modi", "Shah", "Yadav", "Banerjee") or short aliases ("NaMo", "Didi"). Simple substring matching leads to false positives and incorrect cross-linking.

* **Window-based Context Validation**: When a common surname matches multiple entities, scan a window of 5–10 words surrounding the match for disambiguating keywords (e.g., specific ministries, constituencies, or titles like "Union Minister", "Home Minister", "CM").
* **Phonetic Encoding**: Implement Double Metaphone or Soundex checks on the name entity extraction pipeline to group together alternative English spellings of regional Indian names (e.g., "Mamta" vs. "Mamata", "Akhilesh" vs. "Akilesh").

---

## 2. Promise Tracking & AI Integrity Upgrades

### C. Promise-Evidence Semantic Alignment Matrix
Currently, evidence articles are listed statically or fetched globally. You can enhance the reliability of the "Kept/Broken/Ongoing" status by introducing a verification matrix.

* **Relevance Weighting**: Assign an automated precision score (0–100) to each evidence source:
  - **Press Information Bureau (PIB) / Gazetts / Official Portals**: 100 (Primary Source)
  - **Premium National Dailies (The Hindu, Indian Express, ET)**: 85 (Validated Secondary)
  - **Regional News/Opinion Pieces**: 60 (Secondary Support)
* **Chronological Status History**: Update the `promises.json` schema to log each change in promise status. This allows the Next.js frontend to render a progress timeline showing when a promise moved from "ongoing" to "kept" or "broken".

```json
{
  "id": "promise_001",
  "person": "Narendra Modi",
  "promise": "Implement 10% EWS quota in education and employment.",
  "status": "kept",
  "status_history": [
    { "status": "ongoing", "date": "2026-01-10", "reason": "Draft bill introduced" },
    { "status": "kept", "date": "2026-05-28", "reason": "Passed by parliament and gazetted" }
  ]
}
```

---

## 3. Frontend UI/UX Premium Enhancements (Next.js)

### D. Lightweight SVG Sparklines & Progress Meters
To keep the page lightweight and fast-loading under zero-cost deployment environments, avoid heavy charting libraries like Recharts or Chart.js. Use clean, native HTML/CSS/SVG combinations to render visual statistics.

* **Mini Sentiment Split Bar**: Display a tiny horizontal bar showing positive (green), neutral (grey), and negative (red) coverage ratios directly on Neta cards.
* **SVG Promise Completion Dial**: A clean circular progress indicator for each party showing the ratio of kept promises.

```tsx
// Example of a lightweight inline CSS/SVG sentiment bar:
export function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative;
  if (total === 0) return null;
  
  const posPct = (positive / total) * 100;
  const neuPct = (neutral / total) * 100;
  const negPct = (negative / total) * 100;

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-gray-200 mt-2">
      <div style={{ width: `${posPct}%`, backgroundColor: '#1B7050' }} title={`Positive: ${Math.round(posPct)}%`} />
      <div style={{ width: `${neuPct}%`, backgroundColor: '#9CA3AF' }} title={`Neutral: ${Math.round(neuPct)}%`} />
      <div style={{ width: `${negPct}%`, backgroundColor: '#B02828' }} title={`Negative: ${Math.round(negPct)}%`} />
    </div>
  );
}
```

### E. Evidence Chronology Timelines
In `/vaade/[id]/page.tsx`, display the associated evidence articles in a vertical roadmap style. This visual progression helps users immediately identify exactly *why* a promise's status was changed, backing the transparency core of the platform.

### F. Browser Personalization (localStorage)
Enable users to bookmark specific Netas, Parties, or States. Use a lightweight local storage sync to create a "My Dashboard" section on the Home page, prioritizing updates and news feeds relevant to the user's tracked entities.
