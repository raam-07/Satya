import { createClient } from "@libsql/client";

const dbUrl = process.env.SATYA_DB_URL || "file:../satya.db";
const dbToken = process.env.SATYA_DB_TOKEN;

export const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});
