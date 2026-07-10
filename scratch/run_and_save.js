const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

// Manually parse env file
let envUrl = "";
let envToken = "";
try {
  const envContent = fs.readFileSync(path.join(__dirname, "../../.env"), "utf8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("SATYA_DB_URL=")) {
      envUrl = line.split("=")[1].trim();
    }
    if (line.startsWith("SATYA_DB_TOKEN=")) {
      envToken = line.split("=")[1].trim();
    }
  }
} catch (e) {
  // Ignore
}

const dbUrl = envUrl || process.env.SATYA_DB_URL;
const dbToken = envToken || process.env.SATYA_DB_TOKEN;

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

async function main() {
  const query = `
SELECT e.id, e.title AS event_title, e.article_count, e.state,
       a.title AS article_title, date(ea.event_date,'unixepoch') AS day
FROM events e
JOIN event_articles ea ON ea.event_id = e.id
JOIN articles a ON a.id = ea.article_id
WHERE e.id IN (SELECT id FROM events WHERE title IS NOT NULL
               ORDER BY article_count DESC LIMIT 15)
ORDER BY e.article_count DESC, e.id, ea.event_date;
  `;

  try {
    const result = await db.execute(query);
    
    // Save as JSON
    fs.writeFileSync(
      path.join(__dirname, "last_query_result.json"),
      JSON.stringify(result.rows, null, 2)
    );
    
    // Generate a beautiful Markdown table
    let md = "# Top 15 Events by Article Count and Their Articles\n\n";
    md += `*Fetched from remote Turso DB at: ${new Date().toISOString()}*\n\n`;
    md += "| Event ID | Event Title | Count | State | Day | Article Title |\n";
    md += "| :--- | :--- | :--- | :--- | :--- | :--- |\n";
    
    for (const r of result.rows) {
      md += `| ${r.id} | ${r.event_title} | ${r.article_count} | ${r.state} | ${r.day} | ${r.article_title} |\n`;
    }
    
    fs.writeFileSync(path.join(__dirname, "last_query_result.md"), md);
    console.log(`Successfully saved ${result.rows.length} rows to scratch/last_query_result.json and scratch/last_query_result.md`);
  } catch (error) {
    console.error("Database Error:", error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
