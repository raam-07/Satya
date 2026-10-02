import { unstable_cache } from 'next/cache'
import { db } from './db'
import { upscDb } from './db.upsc'
import { transDb } from './db.translation'
import { UPSC_SYLLABUS } from './upscSyllabus'
import type { Language } from './i18n'
import { cleanHindiText } from './utils'

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
  hi?: boolean     // lang='hi': the note itself (why in news) has a Hindi translation
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

const DANGLING_HEADLINE_ENDINGS = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'and', 'or',
  'but', 'as', 'by', 'when', 'while', 'after', 'before', 'that', 'which',
  'who', 'whose', 'its', 'his', 'her', 'their', 'over', 'under', 'against',
  'amid', 'despite', 'during', 'is', 'are', 'was', 'were', 'has', 'have',
  'had', 'will', 'would', 'could', 'should', 'may', 'might', 'been', 'being',
  'from', 'into', 'about', 'than', 'because', 'if', 'so', 'not', 'no',
  'minister', 'chief', 'deputy', 'baby', 'infant', 'pk', 'p.k', 'dr', 'mr', 'ms',
])

function cleanUpscTitle(rephrased?: string | null, original?: string | null, whyInNews?: string | null): string {
  const check = (t?: string | null) => {
    if (!t) return null
    const trimmed = t.trim().replace(/\s[-|]\s[^-|]+$/, '').trim()
    const words = trimmed.split(/\s+/)
    if (words.length < 3) return null
    const last = words[words.length - 1].toLowerCase().replace(/[^a-z0-9.]/g, '')
    if (DANGLING_HEADLINE_ENDINGS.has(last) || (last.length <= 1 && !/^\d+$/.test(last))) return null
    return trimmed
  }

  const goodRephrased = check(rephrased)
  if (goodRephrased) return goodRephrased

  const goodOriginal = check(original)
  if (goodOriginal) return goodOriginal

  if (whyInNews && whyInNews.trim().length >= 15) {
    return whyInNews.trim()
  }

  return (rephrased || original || '').trim()
}

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'also', 'amid', 'among', 'before', 'being',
  'below', 'between', 'both', 'could', 'during', 'each', 'first', 'from', 'further', 'have',
  'having', 'here', 'into', 'just', 'more', 'most', 'other', 'over', 'same', 'should', 'some',
  'such', 'than', 'that', 'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'under', 'until', 'very', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'india', 'indian', 'government',
  'state', 'centre', 'order', 'rules', 'issued', 'court', 'high', 'said', 'today', 'news',
  'minister', 'ministry', 'affairs', 'external', 'official', 'officials', 'department', 'secretary'
])

function extractSignificantTokens(text: string): Set<string> {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  const set = new Set<string>()
  for (const t of tokens) {
    if (t.length >= 4 && !STOPWORDS.has(t)) {
      set.add(t)
    }
  }
  return set
}

/** Attach titles/sources/events from the main DB and collapse items of the same story. */
async function hydrate(rows: Record<string, unknown>[], lang: Language = 'en'): Promise<UpscItem[]> {
  if (!rows.length) return []
  const ids = rows.map(r => Number(r.article_id))
  const ph = ids.map(() => '?').join(',')
  const main = await db.execute({
    sql: `SELECT a.id, a.rephrased_title, a.title AS original_title, a.url, s.name AS source
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
      const [tRes, uRes, evTransRes, noteTitleRes] = await Promise.all([
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
          : Promise.resolve({ rows: [] }),
        // Hindi headline written for the note itself, used when the news article has none
        transDb.execute({
          sql: `SELECT article_id, title_hi FROM upsc_translations WHERE article_id IN (${ph}) AND title_hi IS NOT NULL`,
          args: ids,
        }).catch(() => ({ rows: [] as Record<string, unknown>[] })),
      ])

      tRes.rows.forEach(r => {
        const val = cleanHindiText(r.rephrased_title_hi ? String(r.rephrased_title_hi) : '')
        if (val) titleHiMap.set(Number(r.article_id), val)
      })

      noteTitleRes.rows.forEach(r => {
        const id = Number(r.article_id)
        const val = cleanHindiText(r.title_hi ? String(r.title_hi) : '')
        if (val && !titleHiMap.has(id)) titleHiMap.set(id, val)
      })

      uRes.rows.forEach(r => {
        const why = cleanHindiText(r.why_in_news_hi ? String(r.why_in_news_hi) : '')
        const fact = cleanHindiText(r.fact_box_hi ? String(r.fact_box_hi) : '')
        const mains = cleanHindiText(r.mains_question_hi ? String(r.mains_question_hi) : '')
        const rawPointers = r.prelims_pointers_hi ? arr<UpscPointer>(r.prelims_pointers_hi) : undefined
        const pointers = rawPointers
          ?.map(p => ({ ...p, text: cleanHindiText(p.text) }))
          .filter(p => Boolean(p.text))

        upscTransMap.set(Number(r.article_id), {
          why_in_news_hi: why || undefined,
          fact_box_hi: fact || undefined,
          prelims_pointers_hi: pointers && pointers.length > 0 ? pointers : undefined,
          mains_question_hi: mains || undefined,
        })
      })

      evTransRes.rows.forEach(r => {
        const ev = events.get(Number(r.event_id))
        const val = cleanHindiText(r.title_hi ? String(r.title_hi) : '')
        if (ev && val) {
          ev.title = val
        }
      })
    } catch (e) {
      console.error('[hydrate UPSC] Hindi translation lookup failed:', e)
    }
  }

  const out: UpscItem[] = []
  const seenEvents = new Map<number, UpscItem>()
  const processedItems: { item: UpscItem; tokens: Set<string> }[] = []

  for (const r of rows) {
    const artId = Number(r.article_id)
    const m = byId.get(artId)
    if (!m) continue

    const evId = r.event_id != null ? Number(r.event_id) : null
    // 1. Same event dedup: collapse multiple reports under the same event
    if (evId != null) {
      const existing = seenEvents.get(evId)
      if (existing) {
        existing.related++
        continue
      }
    }

    const uTrans = upscTransMap.get(artId)
    const enTitle = cleanUpscTitle(
      m.rephrased_title ? String(m.rephrased_title) : null,
      m.original_title ? String(m.original_title) : null,
      String(r.why_in_news ?? '')
    )
    const title = (lang === 'hi' && titleHiMap.get(artId)) || enTitle
    const whyInNews = (lang === 'hi' && uTrans?.why_in_news_hi) || String(r.why_in_news ?? '')
    const factBox = (lang === 'hi' && uTrans?.fact_box_hi) || String(r.fact_box ?? '')
    const pointers = (lang === 'hi' && uTrans?.prelims_pointers_hi && uTrans.prelims_pointers_hi.length > 0)
      ? uTrans.prelims_pointers_hi
      : arr<UpscPointer>(r.prelims_pointers)
    const mainsQuestion = (lang === 'hi' && uTrans?.mains_question_hi)
      ? uTrans.mains_question_hi
      : (r.mains_question ? String(r.mains_question) : null)

    const itemTokens = extractSignificantTokens(`${title} ${whyInNews}`)
    const pubAt = Number(r.published_at)
    const paper = String(r.gs_paper)
    const subject = String(r.subject)

    // 2. Near-duplicate content dedup: check recent items within 48h for matching core entities/keywords
    let isDuplicate = false
    for (const p of processedItems) {
      if (Math.abs(p.item.publishedAt - pubAt) <= 172800 && p.item.paper === paper && p.item.subject === subject) {
        let shared = 0
        itemTokens.forEach(t => {
          if (p.tokens.has(t)) shared++
        })
        const unionSize = itemTokens.size + p.tokens.size - shared
        const jaccard = unionSize > 0 ? shared / unionSize : 0
        if (shared >= 5 || (shared >= 4 && jaccard >= 0.20) || (shared >= 3 && jaccard >= 0.35)) {
          p.item.related++
          isDuplicate = true
          break
        }
      }
    }
    if (isDuplicate) continue

    const item: UpscItem = {
      articleId: artId,
      publishedAt: pubAt,
      score: Number(r.upsc_score),
      examType: String(r.exam_type) as UpscItem['examType'],
      paper,
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
      event: evId != null ? events.get(evId) ?? null : null,
      related: 0,
      ...(lang === 'hi' ? { hi: !!uTrans?.why_in_news_hi } : {}),
    }

    if (evId != null) {
      seenEvents.set(evId, item)
    }
    processedItems.push({ item, tokens: itemTokens })
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
  }), ['upsc-feed', JSON.stringify(f), lang], { revalidate: 1800, tags: ['upsc', 'persist', ...(lang === 'hi' ? ['hi'] : [])] })()

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
  }), ['upsc-top', lang], { revalidate: 1800, tags: ['upsc', 'persist', ...(lang === 'hi' ? ['hi'] : [])] })()

export const getUpscStats = () =>
  unstable_cache(() => safe({ today: 0, week: 0, papers: {} as Record<string, number> }, async () => {
    if (!upscDb) return { today: 0, week: 0, papers: {} as Record<string, number> }
    const today = istDayStart()
    const week = today - 6 * 86400
    const [c, p] = await Promise.all([
      upscDb.execute({
        // range on idx_upsc_pub: reads one week of notes, not the whole table
        sql: `SELECT COUNT(*) AS week, SUM(published_at >= ?) AS today FROM upsc_articles WHERE published_at >= ?`,
        args: [today, week],
      }),
      upscDb.execute({
        sql: `SELECT gs_paper, COUNT(*) AS n FROM upsc_articles INDEXED BY idx_upsc_pub WHERE published_at >= ? GROUP BY gs_paper`,
        args: [week],
      }),
    ])
    const papers: Record<string, number> = {}
    p.rows.forEach(r => { papers[String(r.gs_paper)] = Number(r.n) })
    return { today: Number(c.rows[0]?.today ?? 0), week: Number(c.rows[0]?.week ?? 0), papers }
  }), ['upsc-stats'], { revalidate: 1800, tags: ['upsc', 'persist'] })()

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
  }), ['upsc-tag', String(articleId)], { revalidate: 21600, tags: ['upsc'] })()


// ── Daily pages: /upsc/current-affairs/YYYY-MM-DD ───────────────────────────────

/** 'YYYY-MM-DD' -> IST day start (unix s), or null if malformed. */
export function parseIstDay(d: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '')
  if (!m) return null
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 1000
  if (isNaN(utc)) return null
  const back = new Date(utc * 1000).toISOString().slice(0, 10)
  return back === d ? utc - IST : null      // rejects 2026-02-31
}

/** IST day start -> 'YYYY-MM-DD' */
export function istDayKey(dayStart: number): string {
  return new Date((dayStart + IST) * 1000).toISOString().slice(0, 10)
}

/** Every note of one IST day, best first (deduped like the feed). */
export const getUpscDay = (dayStart: number, lang: Language = 'en') =>
  unstable_cache(() => safe([] as UpscItem[], async () => {
    if (!upscDb) return [] as UpscItem[]
    const res = await upscDb.execute({
      sql: `SELECT ${COLS} FROM upsc_articles WHERE published_at >= ? AND published_at < ?
            ORDER BY upsc_score DESC, published_at DESC LIMIT 200`,
      args: [dayStart, dayStart + 86400],
    })
    return hydrate(res.rows as unknown as Record<string, unknown>[], lang)
  }), ['upsc-day', String(dayStart), lang],
  // today changes through the day; past days are settled
  { revalidate: dayStart >= istDayStart() - 86400 ? 1800 : 86400, tags: ['upsc', 'persist', ...(lang === 'hi' ? ['hi'] : [])] })()

/** Days that have notes (newest first) with counts: archive + sitemap. */
export const getUpscDays = (limit = 400) =>
  unstable_cache(() => safe([] as { day: string; start: number; n: number; last: number }[], async () => {
    if (!upscDb) return []
    const res = await upscDb.execute({
      sql: `SELECT ((published_at + ${IST}) / 86400) AS d, COUNT(*) AS n, MAX(published_at) AS last
            FROM upsc_articles WHERE published_at >= ? GROUP BY d ORDER BY d DESC LIMIT ?`,
      // a day has notes only if published that day, so `limit` days back covers `limit` days
      args: [istDayStart() - (limit + 1) * 86400, limit],
    })
    return res.rows.map(r => {
      const start = Number(r.d) * 86400 - IST
      return { day: istDayKey(start), start, n: Number(r.n), last: Number(r.last) }
    })
  }), ['upsc-days', String(limit)], { revalidate: 3600, tags: ['upsc', 'persist'] })()
