import { db } from './db';

/**
 * Endpoints the push service has explicitly rejected (404/410 gone, or 403 for a
 * subscription signed under a retired key).
 *
 * This exists because of an otherwise unbreakable loop: when a subscription dies,
 * the server purges it, but the browser keeps handing the very same dead endpoint
 * back on every visit, so the client cheerfully re-registers the corpse and the
 * user silently never receives anything again. A browser will only mint a fresh
 * endpoint if the old one is explicitly unsubscribed first - and only the server
 * ever learns that it died. So the server records the death here and tells the
 * client, which then replaces the subscription instead of resurrecting it.
 */
let ensured: Promise<void> | null = null;

export function ensureDeadEndpoints(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(
        `CREATE TABLE IF NOT EXISTS dead_endpoints (
           endpoint    TEXT PRIMARY KEY,
           status_code INTEGER,
           died_at     INTEGER NOT NULL
         )`
      )
      .then(() => undefined)
      .catch((err) => {
        ensured = null; // let a later request try again rather than failing forever
        throw err;
      });
  }
  return ensured;
}

export async function markEndpointsDead(
  entries: Array<{ endpoint: string; statusCode?: number }>
): Promise<void> {
  if (entries.length === 0) return;
  await ensureDeadEndpoints();
  const now = Math.floor(Date.now() / 1000);
  const values = entries.map(() => '(?, ?, ?)').join(', ');
  const args: Array<string | number | null> = [];
  for (const e of entries) {
    args.push(e.endpoint, e.statusCode ?? null, now);
  }
  await db.execute({
    sql: `INSERT OR REPLACE INTO dead_endpoints (endpoint, status_code, died_at) VALUES ${values}`,
    args,
  });
}

export async function isEndpointDead(endpoint: string): Promise<boolean> {
  await ensureDeadEndpoints();
  const res = await db.execute({
    sql: 'SELECT 1 FROM dead_endpoints WHERE endpoint = ? LIMIT 1',
    args: [endpoint],
  });
  return (res.rows?.length || 0) > 0;
}

export async function forgetDeadEndpoint(endpoint: string): Promise<void> {
  await ensureDeadEndpoints();
  await db.execute({ sql: 'DELETE FROM dead_endpoints WHERE endpoint = ?', args: [endpoint] });
}
