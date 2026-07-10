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
  // Ignore and fallback to process.env
}

const dbUrl = envUrl || process.env.SATYA_DB_URL;
const dbToken = envToken || process.env.SATYA_DB_TOKEN;

if (!dbUrl) {
  console.error("Error: SATYA_DB_URL is not defined in ../../.env or process.env");
  process.exit(1);
}

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Error: Please provide a SQL query as an argument.");
    console.error("Example: node scratch/run_query.js \"SELECT name FROM sqlite_master WHERE type='table'\"");
    process.exit(1);
  }

  try {
    const result = await db.execute(query);
    console.log(JSON.stringify({
      columns: result.columns,
      rows: result.rows,
      rowsAffected: result.rowsAffected
    }, null, 2));
  } catch (error) {
    console.error("Database Error:", error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
