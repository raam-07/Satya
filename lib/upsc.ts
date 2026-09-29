import { unstable_cache } from 'next/cache'
import { db } from './db'
import { upscDb } from './db.upsc'
import { transDb } from './db.translation'
import { UPSC_SYLLABUS } from './upscSyllabus'
import type { Language } from './i18n'

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
async function hydrate(rows: Record<string, unknown>[], lang: Language = 'en'): Promise<UpscItem[]> {
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

  // Load Hindi translations when requested
  const titleHiMap = new Map<number, string>()
  const upscTransMap = new Map<number, {
    why_in_news_hi?: string
    fact_box_hi?: string
    prelims_pointers_hi?: UpscPointer[]
    mains_question_hi?: string
  }>()

  if (lang === 'hi' && transDb) {
    try {
      const [tRes, uRes, evTransRes] = await Promise.all([
        transDb.execute({
          sql: `SELECT article_id, rephrased_title_hi FROM translations WHERE article_id IN (${ph})`,
          args: ids,
        }),
        transDb.execute({
          sql: `SELECT article_id, why_in_news_hi, fact_box_hi, prelims_pointers_hi, mains_question_hi FROM upsc_translations WHERE article_id IN (${ph})`,
          args: ids,
        }),
        eventIds.length
          ? transDb.execute({
              sql: `SELECT event_id, title_hi FROM event_translations WHERE event_id IN (${eventIds.map(() => '?').join(',')})`,
              args: eventIds,
            })
          : Promise.resolve({ rows: [] })
      ])

      tRes.rows.forEach(r => {
        if (r.rephrased_title_hi) titleHiMap.set(Number(r.article_id), String(r.rephrased_title_hi))
      })

      uRes.rows.forEach(r => {
        upscTransMap.set(Number(r.article_id), {
          why_in_news_hi: r.why_in_news_hi ? String(r.why_in_news_hi) : undefined,
          fact_box_hi: r.fact_box_hi ? String(r.fact_box_hi) : undefined,
          prelims_pointers_hi: r.prelims_pointers_hi ? arr<UpscPointer>(r.prelims_pointers_hi) : undefined,
          mains_question_hi: r.mains_question_hi ? String(r.mains_question_hi) : undefined,
        })
      })

      evTransRes.rows.forEach(r => {
        const ev = events.get(Number(r.event_id))
        if (ev && r.title_hi) {
          ev.title = String(r.title_hi)
        }
      })
    } catch (e) {
      console.error('[hydrate UPSC] Hindi translation lookup failed:', e)
    }
  }

  const out: UpscItem[] = []
  const seen = new Map<string, UpscItem>()
  for (const r of rows) {
    const artId = Number(r.article_id)
    const m = byId.get(artId)
    if (!m) continue
    // same story + same syllabus node = duplicate coverage; events are broad, so the node must match too
    const story = r.event_id != null ? `e${r.event_id}` : r.cluster_id ? `c${r.cluster_id}` : `a${r.article_id}`
    const key = `${story}:${r.syllabus_node}`
    const prev = seen.get(key)
    if (prev) { prev.related++; continue }

    const uTrans = upscTransMap.get(artId)
    const title = (lang === 'hi' && titleHiMap.get(artId)) || String(m.title ?? '')
    const whyInNews = (lang === 'hi' && uTrans?.why_in_news_hi) || String(r.why_in_news ?? '')
    const factBox = (lang === 'hi' && uTrans?.fact_box_hi) || String(r.fact_box ?? '')
    const pointers = (lang === 'hi' && uTrans?.prelims_pointers_hi && uTrans.prelims_pointers_hi.length > 0)
      ? uTrans.prelims_pointers_hi
      : arr<UpscPointer>(r.prelims_pointers)
    const mainsQuestion = (lang === 'hi' && uTrans?.mains_question_hi)
      ? uTrans.mains_question_hi
      : (r.mains_question ? String(r.mains_question) : null)

    const item: UpscItem = {
      articleId: artId,
      publishedAt: Number(r.published_at),
      score: Number(r.upsc_score),
      examType: String(r.exam_type) as UpscItem['examType'],
      paper: String(r.gs_paper),
      subject: String(r.subject),
      node: String(r.syllabus_node),
      secondary: arr(r.secondary),
      whyInNews,
      factBox,
      pointers,
      mainsQuestion,
      mainsDimensions: arr<string>(r.mains_dimensions),
      keywords: arr<string>(r.keywords),
      title,
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

export const getUpscFeed = (f: UpscFilters, lang: Language = 'en') =>
  unstable_cache(() => safe({ items: [] as UpscItem[], hasNext: false }, async () => {
    if (!upscDb) return { items: [] as UpscItem[], hasNext: false }
    const w = where(f)
    const res = await upscDb.execute({
      sql: `SELECT ${COLS} FROM upsc_articles ${w.sql} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
      args: [...w.args, PAGE_SIZE + 1, f.page * PAGE_SIZE],
    })
    const rows = res.rows as unknown as Record<string, unknown>[]
    return { items: await hydrate(rows.slice(0, PAGE_SIZE), lang), hasNext: rows.length > PAGE_SIZE }
  }), ['upsc-feed', JSON.stringify(f), lang], { revalidate: 300, tags: ['upsc'] })()

/** Highest-scoring items of the last ~36h: the "if you read nothing else" list. */
export const getUpscTopPicks = (lang: Language = 'en') =>
  unstable_cache(() => safe([] as UpscItem[], async () => {
    if (!upscDb) return [] as UpscItem[]
    const since = Math.floor(Date.now() / 1000) - 36 * 3600
    const res = await upscDb.execute({
      sql: `SELECT ${COLS} FROM upsc_articles WHERE published_at >= ? AND upsc_score >= 4
            ORDER BY upsc_score DESC, published_at DESC LIMIT 15`,
      args: [since],
    })
    return (await hydrate(res.rows as unknown as Record<string, unknown>[], lang)).slice(0, 5)
  }), ['upsc-top', lang], { revalidate: 300, tags: ['upsc'] })()

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

export type UpscTag = { paper: string; subject: string; node: string; pointers: number; hasMains: boolean }

/** Syllabus tag for one article, or null if it has no UPSC note. */
export const getUpscTag = (articleId: number) =>
  unstable_cache(() => safe(null as UpscTag | null, async () => {
    if (!upscDb) return null
    const r = await upscDb.execute({
      sql: `SELECT gs_paper, subject, syllabus_node, prelims_pointers, mains_question
            FROM upsc_articles WHERE article_id = ?`,
      args: [articleId],
    })
    const row = r.rows[0]
    if (!row) return null
    return {
      paper: String(row.gs_paper),
      subject: String(row.subject),
      node: String(row.syllabus_node),
      pointers: arr(row.prelims_pointers).length,
      hasMains: !!row.mains_question,
    }
  }), ['upsc-tag', String(articleId)], { revalidate: 600, tags: ['upsc'] })()
