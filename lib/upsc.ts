import { unstable_cache } from 'next/cache'
import { db } from './db'
import { upscDb } from './db.upsc'
import { UPSC_SYLLABUS } from './upscSyllabus'

export const UPSC_PAPERS = ['GS1', 'GS2', 'GS3', 'GS4'] as const
export const PAGE_SIZE = 40
const IST = 19800

export type UpscPointer = { type: string; text: string }
export type UpscItem = {
  articleId: number
  publishedAt: number
  score: number
  examType: 'prelims' | 'mains' | 'both'
  paper: string
  subject: string
  node: string
  secondary: { subject: string; node: string }[]
  whyInNews: string
  factBox: string
  pointers: UpscPointer[]
  mainsQuestion: string | null
  mainsDimensions: string[]
  keywords: string[]
  title: string
  source: string | null
  sourceUrl: string | null
  event: { slug: string; title: string | null } | null
  related: number // other items from the same story collapsed into this one
}

export type UpscFilters = { paper?: string; subject?: string; exam?: string; page: number }

const arr = <T,>(v: unknown): T[] => {
  try {
    const x = JSON.parse(String(v ?? '[]'))
    return Array.isArray(x) ? x : []
  } catch {
    return []
  }
}

export const subjectLabel = (s: string) => UPSC_SYLLABUS[s]?.label ?? s
export const nodeLabel = (s: string, n: string) => UPSC_SYLLABUS[s]?.nodes[n] ?? n

export function istDayStart(nowSec = Math.floor(Date.now() / 1000)) {
  return Math.floor((nowSec + IST) / 86400) * 86400 - IST
}

function where(f: UpscFilters) {
  const clauses: string[] = []
  const args: (string | number)[] = []
  if (f.paper && (UPSC_PAPERS as readonly string[]).includes(f.paper)) {
    clauses.push('gs_paper = ?'); args.push(f.paper)
  }
  if (f.subject && UPSC_SYLLABUS[f.subject]) {
    clauses.push('subject = ?'); args.push(f.subject)
  }
  if (f.exam === 'prelims' || f.exam === 'mains') {
    clauses.push("(exam_type = ? OR exam_type = 'both')"); args.push(f.exam)
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args }
}

/** Attach titles/sources/events from the main DB and collapse items of the same story. */
async function hydrate(rows: Record<string, unknown>[]): Promise<UpscItem[]> {
  if (!rows.length) return []
  const ids = rows.map(r => Number(r.article_id))
  const ph = ids.map(() => '?').join(',')
  const main = await db.execute({
    sql: `SELECT a.id, COALESCE(NULLIF(a.rephrased_title, ''), a.title) AS title, a.url, s.name AS source
          FROM articles a LEFT JOIN sources s ON s.id = a.source_id WHERE a.id IN (${ph})`,
    args: ids,
  })
  const byId = new Map(main.rows.map(r => [Number(r.id), r]))

  const eventIds = Array.from(new Set(rows.map(r => r.event_id).filter(v => v != null).map(Number)))
  const events = new Map<number, { slug: string; title: string | null }>()
  if (eventIds.length) {
    const ev = await db.execute({
      sql: `SELECT id, slug, title FROM events WHERE id IN (${eventIds.map(() => '?').join(',')}) AND slug IS NOT NULL AND title IS NOT NULL`,
      args: eventIds,
    }).catch(() => null)
    ev?.rows.forEach(r => events.set(Number(r.id), { slug: String(r.slug), title: r.title ? String(r.title) : null }))
  }

  const out: UpscItem[] = []
  const seen = new Map<string, UpscItem>()
  for (const r of rows) {
    const m = byId.get(Number(r.article_id))
    if (!m) continue
    // same story + same syllabus node = duplicate coverage; events are broad, so the node must match too
    const story = r.event_id != null ? `e${r.event_id}` : r.cluster_id ? `c${r.cluster_id}` : `a${r.article_id}`
    const key = `${story}:${r.syllabus_node}`
    const prev = seen.get(key)
    if (prev) { prev.related++; continue }
    const item: UpscItem = {
      articleId: Number(r.article_id),
      publishedAt: Number(r.published_at),
      score: Number(r.upsc_score),
      examType: String(r.exam_type) as UpscItem['examType'],
      paper: String(r.gs_paper),
      subject: String(r.subject),
      node: String(r.syllabus_node),
      secondary: arr(r.secondary),
      whyInNews: String(r.why_in_news ?? ''),
      factBox: String(r.fact_box ?? ''),
      pointers: arr<UpscPointer>(r.prelims_pointers),
      mainsQuestion: r.mains_question ? String(r.mains_question) : null,
      mainsDimensions: arr<string>(r.mains_dimensions),
      keywords: arr<string>(r.keywords),
      title: String(m.title ?? ''),
      source: m.source ? String(m.source) : null,
      sourceUrl: m.url ? String(m.url) : null,
      event: r.event_id != null ? events.get(Number(r.event_id)) ?? null : null,
      related: 0,
    }
    seen.set(key, item)
    out.push(item)
  }
  return out
}

/** Never let the UPSC DB (separate service, schema may lag a deploy) take the page down. */
async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.error('[upsc] query failed:', e)
    return fallback
  }
}

const COLS = `article_id, published_at, event_id, cluster_id, upsc_score, exam_type, gs_paper, subject,
  syllabus_node, secondary, why_in_news, fact_box, prelims_pointers, mains_question, mains_dimensions, keywords`

export const getUpscFeed = (f: UpscFilters) =>
  unstable_cache(() => safe({ items: [] as UpscItem[], hasNext: false }, async () => {
    if (!upscDb) return { items: [] as UpscItem[], hasNext: false }
    const w = where(f)
    const res = await upscDb.execute({
      sql: `SELECT ${COLS} FROM upsc_articles ${w.sql} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
      args: [...w.args, PAGE_SIZE + 1, f.page * PAGE_SIZE],
    })
    const rows = res.rows as unknown as Record<string, unknown>[]
    return { items: await hydrate(rows.slice(0, PAGE_SIZE)), hasNext: rows.length > PAGE_SIZE }
  }), ['upsc-feed', JSON.stringify(f)], { revalidate: 300, tags: ['upsc'] })()

/** Highest-scoring items of the last ~36h: the "if you read nothing else" list. */
export const getUpscTopPicks = () =>
  unstable_cache(() => safe([] as UpscItem[], async () => {
    if (!upscDb) return [] as UpscItem[]
    const since = Math.floor(Date.now() / 1000) - 36 * 3600
    const res = await upscDb.execute({
      sql: `SELECT ${COLS} FROM upsc_articles WHERE published_at >= ? AND upsc_score >= 4
            ORDER BY upsc_score DESC, published_at DESC LIMIT 15`,
      args: [since],
    })
    return (await hydrate(res.rows as unknown as Record<string, unknown>[])).slice(0, 5)
  }), ['upsc-top'], { revalidate: 300, tags: ['upsc'] })()

export const getUpscStats = () =>
  unstable_cache(() => safe({ today: 0, week: 0, papers: {} as Record<string, number> }, async () => {
    if (!upscDb) return { today: 0, week: 0, papers: {} as Record<string, number> }
    const today = istDayStart()
    const week = today - 6 * 86400
    const [c, p] = await Promise.all([
      upscDb.execute({
        sql: `SELECT SUM(published_at >= ?) AS today, SUM(published_at >= ?) AS week FROM upsc_articles`,
        args: [today, week],
      }),
      upscDb.execute({
        sql: `SELECT gs_paper, COUNT(*) AS n FROM upsc_articles WHERE published_at >= ? GROUP BY gs_paper`,
        args: [week],
      }),
    ])
    const papers: Record<string, number> = {}
    p.rows.forEach(r => { papers[String(r.gs_paper)] = Number(r.n) })
    return { today: Number(c.rows[0]?.today ?? 0), week: Number(c.rows[0]?.week ?? 0), papers }
  }), ['upsc-stats'], { revalidate: 300, tags: ['upsc'] })()
