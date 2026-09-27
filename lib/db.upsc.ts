import { createClient, type Client } from "@libsql/client"

// Null when the UPSC DB isn't configured (local dev / preview builds), so the
// rest of the app still builds and /upsc renders an empty state instead of 500.
export const upscDb: Client | null =
  process.env.SATYA_UPSC_DB_URL && process.env.SATYA_UPSC_DB_TOKEN
    ? createClient({ url: process.env.SATYA_UPSC_DB_URL, authToken: process.env.SATYA_UPSC_DB_TOKEN })
    : null
