// Site-wide stats, precomputed once a day and stored in the main DB (site_stats table).
//
// Pages used to compute these counts on every cache refresh, and each refresh scanned
// tens of thousands of rows (all-time article totals, 30-day breakdowns, per-party and
// per-state counts). Now /api/stats/refresh computes them once a day; pages read one
// row. All-time totals are kept incrementally: articles older than SETTLE_DAYS are
// "settled" and added to stored totals once, so a daily refresh only reads the last
// 30 days (~8k articles, ~16k entity tags).
import { db } from './db'
import { transDb } from './db.translation'
import { upscDb } from './db.upsc'

const DAY = 86400
const SETTLE_DAYS = 3
const OK = `('classified', 'entity_processed', 'processed')`

export type EntityStat = {
  total: number
  n30: number
  cities?: Record<string, number>
  topics?: Record<string, number>
}

export type SiteStats = {
  computed_at: number
  overview: {
    total: number
    last7d: number
    last30d: number
    flagged30d: number
    category_breakdown_30d: Record<string, number>
    top_flag_categories: Record<string, number>
    top_ministers_30d: Record<string, number>
    top_parties_30d: Record<string, number>
    top_states_30d: Record<string, number>
  }
  ledger: { articles_classified: number; active_timelines: number; upsc_notes: number | null; hindi_records: number | null }
  sources: { name: string; n30: number; hi30: number; last: number }[]
  /** key: `${kind}:${slug}` (article_entities) */
  entities: Record<string, EntityStat>
}

type Totals = { hwm: number; articles: number; entities: Record<string, number> }

const ensureTable = () =>
  db.execute(`CREATE TABLE IF NOT EXISTS site_stats (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)`)

/** Reads the precomputed stats (one row). Null when missing or unreadable: callers fall back to live queries. */
export async function readSiteStats(): Promise<SiteStats | null> {
  try {
    const r = await db.execute({ sql: `SELECT value FROM site_stats WHERE key = 'stats'`, args: [] })
    if (!r.rows.length) return null
    const s = JSON.parse(String(r.rows[0].value)) as SiteStats
    // Too old to trust (refresh job broken for days): use live numbers instead.
    if (!s?.computed_at || Date.now() / 1000 - s.computed_at > 4 * DAY) return null
    return s
  } catch {
    return null
  }
}

const jsonArr = (v: unknown): string[] => {
  if (!v) return []
  try {
    const a = JSON.parse(String(v))
    return Array.isArray(a) ? a.map(String) : []
  } catch {
    return []
  }
}

const bump = (m: Record<string, number>, k: string, n = 1) => { m[k] = (m[k] || 0) + n }

const top = (m: Record<string, number>, n?: number): Record<string, number> => {
  const e = Object.entries(m).sort((a, b) => b[1] - a[1])
  return Object.fromEntries(n ? e.slice(0, n) : e)
}

/** Same aliasing the overview used when it counted states live. */
function normState(v: string): string {
  if (v === 'Andaman') return 'Andaman and Nicobar'
  if (v === 'Kashmir' || v === 'Jammu' || v === 'J&K' || v === 'JK') return 'Jammu and Kashmir'
  if (v === 'UP') return 'Uttar Pradesh'
  return v
}

async function firstIdFrom(ts: number): Promise<number | null> {
  const r = await db.execute({ sql: `SELECT id FROM articles WHERE scraped_at >= ? ORDER BY scraped_at LIMIT 1`, args: [ts] })
  return r.rows.length ? Number(r.rows[0].id) : null
}

async function lastIdBefore(ts: number): Promise<number> {
  const r = await db.execute({ sql: `SELECT id FROM articles WHERE scraped_at < ? ORDER BY scraped_at DESC LIMIT 1`, args: [ts] })
  return r.rows.length ? Number(r.rows[0].id) : 0
}

async function count(client: typeof db | null, sql: string): Promise<number | null> {
  if (!client) return null
  try {
    const r = await client.execute(sql)
    return Number(r.rows[0]?.c ?? 0)
  } catch (e) {
    console.error('[site-stats] count failed:', sql, e)
    return null
  }
}

/** Recomputes everything and stores it. `full` recounts all-time totals from scratch
 *  (needed after a bulk re-tag of old articles; otherwise only the first run does it). */
export async function refreshSiteStats(full = false) {
  const t0 = Date.now()
  await ensureTable()
  const now = Math.floor(Date.now() / 1000)
  const cut30 = now - 30 * DAY, cut7 = now - 7 * DAY

  const floor30 = (await firstIdFrom(cut30)) ?? Number.MAX_SAFE_INTEGER
  const hwm = await lastIdBefore(now - SETTLE_DAYS * DAY) // articles at or below this id are settled

  let prev: Totals | null = null
  try {
    const r = await db.execute(`SELECT value FROM site_stats WHERE key = 'totals'`)
    if (r.rows.length) prev = JSON.parse(String(r.rows[0].value))
  } catch {}

  // ---- one pass over the last 30 days (ids follow scraped_at; rowid range = only these rows) ----
  type A = {
    id: number; ts: number; ok: boolean; cat: string; flag: boolean; flagCat: string; src: number; hi: boolean
    min: string[]; par: string[]; st: string[]; city: string[]; topic: string[]
  }
  const arts = new Map<number, A>()
  let cursor = floor30 - 1
  for (;;) {
    const r = await db.execute({
      sql: `SELECT id, scraped_at, status, category, civic_flag, civic_flag_category, source_id, translated_hi,
                   ministers_mentioned, party_mentioned, states_mentioned, cities_mentioned, topic_tags
            FROM articles WHERE id > ? ORDER BY id LIMIT 2000`,
      args: [cursor],
    })
    for (const x of r.rows) {
      const id = Number(x.id)
      arts.set(id, {
        id, ts: Number(x.scraped_at || 0),
        ok: ['classified', 'entity_processed', 'processed'].includes(String(x.status)),
        cat: x.category ? String(x.category) : '',
        flag: Number(x.civic_flag) > 0 || String(x.civic_flag).toLowerCase() === 'true',
        flagCat: x.civic_flag_category ? String(x.civic_flag_category) : '',
        src: Number(x.source_id || 0), hi: Number(x.translated_hi) === 1,
        min: jsonArr(x.ministers_mentioned), par: jsonArr(x.party_mentioned), st: jsonArr(x.states_mentioned),
        city: jsonArr(x.cities_mentioned), topic: jsonArr(x.topic_tags),
      })
      cursor = id
    }
    if (r.rows.length < 2000) break
  }

  const tags: { id: number; key: string }[] = []
  if (arts.size) {
    let c2 = floor30 - 1
    for (;;) {
      const r = await db.execute({
        sql: `SELECT article_id, kind, slug FROM article_entities WHERE article_id > ? ORDER BY article_id LIMIT 5000`,
        args: [c2],
      })
      for (const x of r.rows) {
        c2 = Number(x.article_id)
        tags.push({ id: c2, key: `${x.kind}:${x.slug}` })
      }
      if (r.rows.length < 5000) break
    }
  }

  // ---- all-time totals: settled part (stored) + recent part (recounted every day) ----
  let totals: Totals
  const needFull = full || !prev || prev.hwm < floor30 - 1 || hwm < prev.hwm
  if (needFull) {
    const [a, e] = await db.batch([
      { sql: `SELECT COUNT(*) AS c FROM articles WHERE status IN ${OK} AND id <= ?`, args: [hwm] },
      {
        sql: `SELECT ae.kind, ae.slug, COUNT(*) AS c FROM article_entities ae JOIN articles a ON a.id = ae.article_id
              WHERE ae.article_id <= ? AND a.status IN ${OK} GROUP BY ae.kind, ae.slug`,
        args: [hwm],
      },
    ], 'read')
    const ents: Record<string, number> = {}
    e.rows.forEach(x => { ents[`${x.kind}:${x.slug}`] = Number(x.c) })
    totals = { hwm, articles: Number(a.rows[0]?.c ?? 0), entities: ents }
  } else {
    totals = { hwm, articles: prev!.articles, entities: { ...prev!.entities } }
    for (const a of Array.from(arts.values())) if (a.ok && a.id > prev!.hwm && a.id <= hwm) totals.articles++
    for (const t of tags) {
      const a = arts.get(t.id)
      if (a?.ok && t.id > prev!.hwm && t.id <= hwm) bump(totals.entities, t.key)
    }
  }

  // ---- aggregates ----
  let total = totals.articles, last7d = 0, last30d = 0, flagged30d = 0
  const cats: Record<string, number> = {}, flagCats: Record<string, number> = {}
  const mins: Record<string, number> = {}, pars: Record<string, number> = {}, sts: Record<string, number> = {}
  const bySrc = new Map<number, { n30: number; hi30: number; last: number }>()
  for (const a of Array.from(arts.values())) {
    if (!a.ok) continue
    if (a.id > hwm) total++
    if (a.ts < cut30) continue
    last30d++
    if (a.ts >= cut7) last7d++
    if (a.cat) bump(cats, a.cat)
    if (a.flag) { flagged30d++; if (a.flagCat) bump(flagCats, a.flagCat) }
    a.min.forEach(v => bump(mins, v))
    a.par.forEach(v => bump(pars, v))
    a.st.forEach(v => bump(sts, normState(v)))
    const s = bySrc.get(a.src) || { n30: 0, hi30: 0, last: 0 }
    s.n30++; if (a.hi) s.hi30++; if (a.ts > s.last) s.last = a.ts
    bySrc.set(a.src, s)
  }

  const entities: Record<string, EntityStat> = {}
  for (const [k, n] of Object.entries(totals.entities)) entities[k] = { total: n, n30: 0 }
  const stateCities: Record<string, Record<string, number>> = {}, stateTopics: Record<string, Record<string, number>> = {}
  for (const t of tags) {
    const a = arts.get(t.id)
    if (!a?.ok) continue
    const e = (entities[t.key] ||= { total: 0, n30: 0 })
    if (a.id > hwm) e.total++
    if (a.ts < cut30) continue
    e.n30++
    if (t.key.startsWith('state:')) {
      a.city.forEach(v => bump((stateCities[t.key] ||= {}), v))
      a.topic.forEach(v => bump((stateTopics[t.key] ||= {}), v))
    }
  }
  for (const k of Object.keys(stateCities)) entities[k].cities = top(stateCities[k], 30)
  for (const k of Object.keys(stateTopics)) entities[k].topics = top(stateTopics[k], 30)

  const srcNames = await db.execute(`SELECT id, name FROM sources`)
  const nameOf = new Map(srcNames.rows.map(r => [Number(r.id), String(r.name)]))
  const sources = Array.from(bySrc.entries())
    .filter(([id]) => nameOf.has(id))
    .map(([id, s]) => ({ name: nameOf.get(id)!, ...s }))

  // ---- ledger (other DBs; small tables, once a day) ----
  const [timelines, upsc, trans, ms] = await Promise.all([
    count(db, `SELECT COUNT(*) AS c FROM events WHERE title IS NOT NULL AND slug IS NOT NULL AND slug != ''`),
    count(upscDb, `SELECT COUNT(*) AS c FROM upsc_articles`),
    count(transDb, `SELECT COUNT(*) AS c FROM translations`),
    count(transDb, `SELECT COUNT(*) AS c FROM event_milestone_translations`),
  ])

  const stats: SiteStats = {
    computed_at: now,
    overview: {
      total, last7d, last30d, flagged30d,
      category_breakdown_30d: cats,
      top_flag_categories: flagCats,
      top_ministers_30d: top(mins, 20),
      top_parties_30d: top(pars),
      top_states_30d: top(sts),
    },
    ledger: {
      articles_classified: total,
      active_timelines: timelines ?? 0,
      upsc_notes: upsc,
      hindi_records: trans == null || ms == null ? null : trans + ms,
    },
    sources,
    entities,
  }

  await db.batch([
    { sql: `INSERT OR REPLACE INTO site_stats (key, value, updated_at) VALUES ('stats', ?, ?)`, args: [JSON.stringify(stats), now] },
    { sql: `INSERT OR REPLACE INTO site_stats (key, value, updated_at) VALUES ('totals', ?, ?)`, args: [JSON.stringify(totals), now] },
  ], 'write')

  return {
    ms: Date.now() - t0,
    full_totals: needFull,
    articles_30d_window: arts.size,
    entity_tags_30d_window: tags.length,
    entities: Object.keys(entities).length,
    total,
    hwm,
  }
}

/** Entity stats for a set of slugs of one kind (a state page covers its aliases too). */
export function entityStats(s: SiteStats, kind: string, slugs: string[]) {
  let total = 0, n30 = 0
  const cities: Record<string, number> = {}, topics: Record<string, number> = {}
  for (const slug of slugs) {
    const e = s.entities[`${kind}:${slug}`]
    if (!e) continue
    total += e.total
    n30 += e.n30
    Object.entries(e.cities || {}).forEach(([k, v]) => bump(cities, k, v))
    Object.entries(e.topics || {}).forEach(([k, v]) => bump(topics, k, v))
  }
  return { total, n30, cities: top(cities, 10), topics: top(topics, 10) }
}
