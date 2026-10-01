import { db } from './db'

/** Drops persisted data-cache entries from older code versions and anything not
 *  refreshed in 3 weeks (see cache-handler.js). Runs from the daily stats refresh. */
export async function pruneDataCache(): Promise<number | null> {
  try {
    const exists = await db.execute(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'next_data_cache'`)
    if (!exists.rows.length) return 0
    const ver = process.env.SATYA_DATA_CACHE_VERSION
    const cutoff = Date.now() - 21 * 86400 * 1000
    const r = ver
      ? await db.execute({ sql: `DELETE FROM next_data_cache WHERE ver != ? OR last_modified < ?`, args: [ver, cutoff] })
      : await db.execute({ sql: `DELETE FROM next_data_cache WHERE last_modified < ?`, args: [cutoff] })
    return r.rowsAffected
  } catch (e) {
    console.error('[data-cache] prune failed:', e)
    return null
  }
}
