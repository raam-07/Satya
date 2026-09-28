import { createClient, type Client } from "@libsql/client"

// Translation Database (Database B: holds Hindi articles, timelines, and UPSC notes)
export const transDb: Client | null =
  process.env.SATYA_TRANSLATION_DB_URL && process.env.SATYA_TRANSLATION_DB_TOKEN
    ? createClient({
        url: process.env.SATYA_TRANSLATION_DB_URL,
        authToken: process.env.SATYA_TRANSLATION_DB_TOKEN,
      })
    : null
