// Persistent data cache for Next.js (next.config.js -> cacheHandler).
//
// Why: every Render deploy starts a fresh instance with an empty .next/cache, so every
// page's data was re-queried from Turso after each push (hundreds of thousands of rows).
// This keeps the expensive data entries (those tagged 'persist' by lib/api.server.ts and
// lib/upsc.ts) in a Turso table as well, so after a deploy a page costs one row read
// instead of its full set of queries.
//
// - Layer 1: in-process memory (LRU by size). Layer 2: Turso table next_data_cache.
// - Entries are versioned by a hash of the data-layer source files: a deploy that changes
//   how data is queried or shaped starts from an empty cache (as before); a deploy that only
//   changes UI/pages reuses it.
// - Tag revalidation (revalidateTag) is recorded in next_data_cache_tags and honoured.
// - Everything else (pages, routes, untagged fetches) goes to Next's own file cache.
// - Any Turso error = cache miss (pages query the DB as before); repeated errors switch the
//   persistent layer off for a minute. SATYA_DATA_CACHE=off disables it entirely.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const FileSystemCache = require('next/dist/server/lib/incremental-cache/file-system-cache').default;

const PERSIST_TAG = 'persist';
const MEM_BUDGET = 48 * 1024 * 1024;
const MAX_VALUE_BYTES = 4 * 1024 * 1024; // compressed
const OP_TIMEOUT_MS = 2500;

// Files whose code decides what a cached value contains.
const DATA_FILES = [
  'lib/api.server.ts', 'lib/upsc.ts', 'lib/siteStats.ts', 'lib/slug.ts', 'lib/utils.ts',
  'lib/upscSyllabus.ts', 'lib/db.ts', 'lib/db.translation.ts', 'lib/db.upsc.ts', 'cache-handler.js',
];

function computeVersion() {
  try {
    const h = crypto.createHash('sha256');
    for (const f of DATA_FILES) h.update(f + '\0' + fs.readFileSync(path.join(process.cwd(), f)) + '\0');
    return 'd' + h.digest('hex').slice(0, 16);
  } catch {
    try {
      return 'b' + fs.readFileSync(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim();
    } catch {
      return null; // unknown version: never persist
    }
  }
}

const g = globalThis;
const state = g.__satyaDataCache || (g.__satyaDataCache = {
  version: computeVersion(),
  client: undefined,
  ready: null, // Promise: table created + tag times loaded
  tagTimes: new Map(), // tag -> ms of last revalidateTag
  mem: new Map(), // key -> { entry, size }
  memSize: 0,
  failures: 0,
  offUntil: 0,
});
if (state.version) process.env.SATYA_DATA_CACHE_VERSION = state.version;

function client() {
  if (state.client !== undefined) return state.client;
  state.client = null;
  const url = process.env.SATYA_DB_URL, token = process.env.SATYA_DB_TOKEN;
  if (process.env.SATYA_DATA_CACHE === 'off' || !state.version || !url || !token || url.startsWith('file:')) return null;
  try {
    state.client = require('@libsql/client').createClient({ url, authToken: token });
  } catch (e) {
    console.error('[data-cache] client unavailable:', e && e.message);
  }
  return state.client;
}

function withTimeout(p) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), OP_TIMEOUT_MS); })])
    .finally(() => clearTimeout(t));
}

function available() {
  return client() && Date.now() >= state.offUntil;
}

function ok() { state.failures = 0; }
function failed(op, e) {
  state.failures++;
  if (state.failures >= 3) { state.offUntil = Date.now() + 60000; state.failures = 0; }
  console.error(`[data-cache] ${op} failed:`, e && e.message);
}

function ensureReady() {
  if (state.ready) return state.ready;
  state.ready = (async () => {
    const c = client();
    await withTimeout(c.batch([
      `CREATE TABLE IF NOT EXISTS next_data_cache (key TEXT PRIMARY KEY, ver TEXT NOT NULL, value BLOB NOT NULL, tags TEXT NOT NULL, last_modified INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS next_data_cache_tags (tag TEXT PRIMARY KEY, revalidated_at INTEGER NOT NULL)`,
    ], 'write'));
    const r = await withTimeout(c.execute(`SELECT tag, revalidated_at FROM next_data_cache_tags`));
    for (const row of r.rows) {
      const t = String(row.tag), at = Number(row.revalidated_at);
      if (!(state.tagTimes.get(t) >= at)) state.tagTimes.set(t, at);
    }
  })().catch((e) => { state.ready = null; throw e; });
  return state.ready;
}

function wasRevalidated(tags, lastModified) {
  return tags.some((t) => (state.tagTimes.get(t) || 0) >= lastModified);
}

function memGet(key) {
  const m = state.mem.get(key);
  if (!m) return null;
  state.mem.delete(key); state.mem.set(key, m); // LRU touch
  return m.entry;
}

function memSet(key, entry, size) {
  const old = state.mem.get(key);
  if (old) { state.memSize -= old.size; state.mem.delete(key); }
  if (size > MEM_BUDGET / 4) return;
  state.mem.set(key, { entry, size });
  state.memSize += size;
  for (const [k, v] of state.mem) {
    if (state.memSize <= MEM_BUDGET) break;
    state.mem.delete(k); state.memSize -= v.size;
  }
}

const persisted = (tags) => Array.isArray(tags) && tags.includes(PERSIST_TAG);
const dbKey = (key) => `${state.version}:${key}`;

class SatyaCacheHandler {
  constructor(ctx) {
    this.fsCache = new FileSystemCache(ctx);
  }

  async get(key, ctx = {}) {
    if (ctx.kindHint !== 'fetch' || !persisted(ctx.tags)) return this.fsCache.get(key, ctx);
    const tags = [...(ctx.tags || []), ...(ctx.softTags || [])];

    const hit = memGet(key);
    if (hit) return wasRevalidated(tags, hit.lastModified) ? null : hit;
    if (!available()) return this.fsCache.get(key, ctx);

    try {
      await ensureReady();
      const r = await withTimeout(client().execute({
        sql: `SELECT value, last_modified FROM next_data_cache WHERE key = ?`,
        args: [dbKey(key)],
      }));
      ok();
      const row = r.rows[0];
      if (!row) return null;
      const raw = zlib.gunzipSync(Buffer.from(row.value));
      const entry = { lastModified: Number(row.last_modified), value: JSON.parse(raw.toString('utf8')) };
      if (!entry.value || entry.value.kind !== 'FETCH') return null;
      memSet(key, entry, raw.length);
      return wasRevalidated(tags, entry.lastModified) ? null : entry;
    } catch (e) {
      failed('get', e);
      return null;
    }
  }

  async set(key, data, ctx = {}) {
    if (!data || data.kind !== 'FETCH' || !persisted(ctx.tags)) return this.fsCache.set(key, data, ctx);
    const entry = { lastModified: Date.now(), value: data };
    const json = JSON.stringify(data);
    memSet(key, entry, json.length);
    if (!available()) return;
    try {
      const blob = zlib.gzipSync(json);
      if (blob.length > MAX_VALUE_BYTES) return;
      await ensureReady();
      await withTimeout(client().execute({
        sql: `INSERT OR REPLACE INTO next_data_cache (key, ver, value, tags, last_modified) VALUES (?, ?, ?, ?, ?)`,
        args: [dbKey(key), state.version, blob, JSON.stringify(ctx.tags || []), entry.lastModified],
      }));
      ok();
    } catch (e) {
      failed('set', e);
    }
  }

  async revalidateTag(...args) {
    const tags = [args[0]].flat().filter(Boolean).map(String);
    const now = Date.now();
    tags.forEach((t) => state.tagTimes.set(t, now));
    await this.fsCache.revalidateTag(...args);
    if (!tags.length || !available()) return;
    try {
      await ensureReady();
      await withTimeout(client().batch(tags.map((t) => ({
        sql: `INSERT OR REPLACE INTO next_data_cache_tags (tag, revalidated_at) VALUES (?, ?)`,
        args: [t, now],
      })), 'write'));
      ok();
    } catch (e) {
      failed('revalidateTag', e);
    }
  }
}

module.exports = SatyaCacheHandler;
