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
    if (line.trim().startsWith("SATYA_DB_URL=")) {
      envUrl = line.split("=")[1].trim();
    }
    if (line.trim().startsWith("SATYA_DB_TOKEN=")) {
      envToken = line.split("=")[1].trim();
    }
  }
} catch (e) {
  console.log("Could not read parent .env, trying process.env...");
}

const dbUrl = envUrl || process.env.SATYA_DB_URL;
const dbToken = envToken || process.env.SATYA_DB_TOKEN;

if (!dbUrl) {
  console.error("Error: SATYA_DB_URL is not defined.");
  process.exit(1);
}

console.log("Connecting to:", dbUrl);
const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

const INDEXES = [
  // 1. Basic / Compound Indexes from schema.sql
  { name: "idx_articles_status_scraped", sql: "CREATE INDEX IF NOT EXISTS idx_articles_status_scraped ON articles(status, scraped_at)" },
  { name: "idx_articles_status_civic_scraped", sql: "CREATE INDEX IF NOT EXISTS idx_articles_status_civic_scraped ON articles(status, civic_flag, scraped_at)" },
  { name: "idx_articles_status_category_scraped", sql: "CREATE INDEX IF NOT EXISTS idx_articles_status_category_scraped ON articles(status, category, scraped_at)" },
  { name: "idx_articles_source_id", sql: "CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)" },
  { name: "idx_articles_source_scraped", sql: "CREATE INDEX IF NOT EXISTS idx_articles_source_scraped ON articles(source_id, scraped_at DESC) WHERE status IN ('classified', 'entity_processed', 'processed')" },
  
  // 2. Extra performance optimizations
  { name: "idx_articles_cat_scraped_desc", sql: "CREATE INDEX IF NOT EXISTS idx_articles_cat_scraped_desc ON articles(category, scraped_at DESC) WHERE status IN ('classified', 'entity_processed', 'processed')" },
  { name: "idx_articles_scraped_category", sql: "CREATE INDEX IF NOT EXISTS idx_articles_scraped_category ON articles(scraped_at, category) WHERE status IN ('classified', 'entity_processed', 'processed')" }
];

async function main() {
  for (const index of INDEXES) {
    console.log(`Creating index ${index.name}...`);
    try {
      await db.execute(index.sql);
      console.log(`Success: ${index.name}`);
    } catch (err) {
      console.error(`Failed to create index ${index.name}:`, err.message);
    }
  }
  
  console.log("\nVerifying current indexes on articles table:");
  try {
    const res = await db.execute("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'articles'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Verification failed:", err.message);
  }
  process.exit(0);
}

main();
