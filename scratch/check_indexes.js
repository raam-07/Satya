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
  console.log("Could not read parent .env, trying process.env...");
}

const dbUrl = envUrl || process.env.SATYA_DB_URL;
const dbToken = envToken || process.env.SATYA_DB_TOKEN;

console.log("DB URL:", dbUrl);
console.log("DB Token exists:", !!dbToken);

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

async function main() {
  try {
    const result = await db.execute("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'articles'");
    console.log("Existing indexes on 'articles':");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    process.exit(0);
  }
}

main();
