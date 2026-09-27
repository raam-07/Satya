import { createClient } from "@libsql/client"

if (!process.env.SATYA_UPSC_DB_URL || !process.env.SATYA_UPSC_DB_TOKEN) {
  throw new Error("Missing SATYA_UPSC_DB credentials")
}

export const upscDb = createClient({
  url: process.env.SATYA_UPSC_DB_URL,
  authToken: process.env.SATYA_UPSC_DB_TOKEN,
})
