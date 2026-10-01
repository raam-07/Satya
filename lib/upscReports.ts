// UPSC current-affairs reports: daily, weekly (ISO week, Mon–Sun IST) and monthly digests,
// in English and Hindi. Built from the per-day note lists (getUpscDay, already cached and
// persisted), so a weekly or monthly report costs no extra database reads beyond today's.
//
// The PDFs are rendered by a GitHub Actions job (satya-upsc-service/reports) that prints
// /upsc/reports/print/... with Chromium (correct Devanagari shaping) whenever a report's
// content hash changes, and stores them in the UPSC DB (upsc_reports + upsc_report_chunks).
import crypto from 'crypto'
import { unstable_cache } from 'next/cache'
import { upscDb } from './db.upsc'
import { getUpscDay, getUpscDays, istDayStart, istDayKey, parseIstDay, UPSC_PAPERS, type UpscItem, type UpscPointer } from './upsc'
import { UPSC_SYLLABUS } from './upscSyllabus'
import type { Language } from './i18n'

const IST = 19800
const DAY = 86400
/** Bump when the report layout or selection changes: every PDF is rebuilt. */
export const REPORT_VERSION = 1
/** A Hindi report exists once this share of its notes is translated (same rule as the daily pages). */
export const HI_READY = 0.8

export type ReportKind = 'daily' | 'weekly' | 'monthly'
export const REPORT_KINDS: ReportKind[] = ['daily', 'weekly', 'monthly']

const CAPS: Record<ReportKind, { notes: number; top: number; mains: number; revision: number }> = {
  daily: { notes: 200, top: 5, mains: 8, revision: 40 },
  weekly: { notes: 50, top: 10, mains: 15, revision: 80 },
  monthly: { notes: 120, top: 15, mains: 30, revision: 140 },
}
/** Weekly/monthly: no subject takes more than this share of the digest (first pass). */
const SUBJECT_SHARE = 0.3

export const SUBJECT_HI: Record<string, string> = {
  history_culture: 'इतिहास एवं संस्कृति', society: 'भारतीय समाज', geography: 'भूगोल',
  polity: 'राजव्यवस्था एवं संविधान', governance: 'शासन', social_justice: 'सामाजिक न्याय',
  ir: 'अंतर्राष्ट्रीय संबंध', economy: 'अर्थव्यवस्था', agriculture: 'कृषि',
  science_tech: 'विज्ञान एवं प्रौद्योगिकी', environment: 'पर्यावरण एवं पारिस्थितिकी',
  disaster: 'आपदा प्रबंधन', security: 'आंतरिक सुरक्षा', ethics: 'नीतिशास्त्र एवं सत्यनिष्ठा',
}
export const subjectName = (s: string, isHi: boolean) => (isHi && SUBJECT_HI[s]) || UPSC_SYLLABUS[s]?.label || s

export const POINTER_LABEL_HI: Record<string, string> = {
  constitution: 'संविधान', act_bill: 'अधिनियम / विधेयक', scheme: 'योजना', institution: 'संस्था',
  report_index: 'रिपोर्ट / सूचकांक', place: 'स्थान', species_environment: 'पर्यावरण',
  sci_tech: 'विज्ञान-तकनीक', international_org: 'अंतर्राष्ट्रीय संगठन', person_post: 'पद', data_fact: 'तथ्य',
}

// ---------------------------------------------------------------- periods

export type Period = { kind: ReportKind; key: string; start: number; end: number }

const pad = (n: number) => String(n).padStart(2, '0')

/** IST calendar date (as a UTC Date at midnight) for a unix time. */
const istDate = (sec: number) => {
  const d = new Date((sec + IST) * 1000)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
const istStartOf = (utcMidnight: Date) => utcMidnight.getTime() / 1000 - IST

function isoWeekOf(utcMidnight: Date): { year: number; week: number } {
  const d = new Date(utcMidnight)
  const dow = (d.getUTCDay() + 6) % 7 // Mon=0
  d.setUTCDate(d.getUTCDate() - dow + 3) // Thursday of this week
  const year = d.getUTCFullYear()
  const firstThu = new Date(Date.UTC(year, 0, 4))
  firstThu.setUTCDate(4 - ((firstThu.getUTCDay() + 6) % 7) + 3)
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 86400000))
  return { year, week }
}

function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const mon = new Date(jan4)
  mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7)
  return mon
}

export function periodKeyFor(kind: ReportKind, sec: number): string {
  const d = istDate(sec)
  if (kind === 'daily') return istDayKey(istStartOf(d))
  if (kind === 'monthly') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
  const w = isoWeekOf(d)
  return `${w.year}-W${pad(w.week)}`
}

export function parsePeriod(kind: string, key: string): Period | null {
  const now = Math.floor(Date.now() / 1000)
  let start: number | null = null, end = 0
  if (kind === 'daily') {
    start = parseIstDay(key)
    if (start !== null) end = start + DAY
  } else if (kind === 'weekly') {
    const m = /^(\d{4})-W(\d{2})$/.exec(key)
    if (!m) return null
    const year = Number(m[1]), week = Number(m[2])
    if (week < 1 || week > 53) return null
    const mon = isoWeekMonday(year, week)
    if (isoWeekOf(mon).week !== week) return null
    start = istStartOf(mon)
    end = start + 7 * DAY
  } else if (kind === 'monthly') {
    const m = /^(\d{4})-(\d{2})$/.exec(key)
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null
    start = istStartOf(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)))
    end = istStartOf(new Date(Date.UTC(Number(m[1]), Number(m[2]), 1)))
  } else {
    return null
  }
  if (start === null || start > now) return null
  return { kind: kind as ReportKind, key, start, end }
}

const fmt = (sec: number, isHi: boolean, opts: Intl.DateTimeFormatOptions) =>
  new Date(sec * 1000 + 12 * 3600 * 1000).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', ...opts })

export function periodLabel(p: Period, isHi: boolean): string {
  if (p.kind === 'daily') return fmt(p.start, isHi, { day: 'numeric', month: 'long', year: 'numeric' })
  if (p.kind === 'monthly') return fmt(p.start, isHi, { month: 'long', year: 'numeric' })
  const w = Number(p.key.slice(6))
  const a = fmt(p.start, isHi, { day: 'numeric', month: 'short' })
  const b = fmt(p.end - DAY, isHi, { day: 'numeric', month: 'short', year: 'numeric' })
  return isHi ? `सप्ताह ${w} · ${a} – ${b}` : `Week ${w} · ${a} – ${b}`
}

export function reportTitle(p: Period, isHi: boolean): string {
  const l = periodLabel(p, isHi)
  if (isHi) {
    if (p.kind === 'daily') return `यूपीएससी करेंट अफेयर्स — ${l}`
    if (p.kind === 'weekly') return `यूपीएससी साप्ताहिक करेंट अफेयर्स — ${l}`
    return `यूपीएससी मासिक करेंट अफेयर्स — ${l}`
  }
  if (p.kind === 'daily') return `UPSC Current Affairs — ${l}`
  if (p.kind === 'weekly') return `UPSC Weekly Current Affairs — ${l}`
  return `UPSC Monthly Current Affairs — ${l}`
}

/** Web page for a report (daily reports are the existing day pages). */
export function reportPagePath(kind: ReportKind, key: string, isHi: boolean) {
  const base = kind === 'daily' ? `/upsc/current-affairs/${key}`
    : kind === 'weekly' ? `/upsc/current-affairs/week/${key}` : `/upsc/current-affairs/month/${key}`
  return isHi ? `${base}?lang=hi` : base
}
export const reportPdfPath = (kind: ReportKind, key: string, isHi: boolean) =>
  `/upsc/reports/pdf/${kind}/${key}${isHi ? '?lang=hi' : ''}`
export const reportFileKey = (kind: ReportKind, key: string, lang: Language) => `${kind}:${key}:${lang}`

// ---------------------------------------------------------------- report content

export type ReportGroup = { paper: string; subjects: { subject: string; items: UpscItem[] }[]; count: number }
export type RevisionPoint = UpscPointer & { articleId: number }

export type Report = {
  period: Period
  lang: Language
  title: string
  label: string
  groups: ReportGroup[]
  top: UpscItem[]
  mains: UpscItem[]
  revision: RevisionPoint[]
  totalNotes: number   // distinct notes in the period (before the digest cap)
  selected: number     // notes in this report
  hiShare: number      // lang=hi: share of the period's notes translated
  updatedAt: number    // newest note's publish time
  hash: string
}

function dedupeAcrossDays(items: UpscItem[]): UpscItem[] {
  const byKey = new Map<string, UpscItem>()
  for (const it of items) {
    const k = it.event?.slug ? `e:${it.event.slug}` : `a:${it.articleId}`
    const prev = byKey.get(k)
    if (!prev) { byKey.set(k, { ...it }); continue }
    const keep = it.score > prev.score || (it.score === prev.score && it.publishedAt > prev.publishedAt) ? { ...it } : prev
    keep.related = prev.related + it.related + 1
    byKey.set(k, keep)
  }
  return Array.from(byKey.values())
}

// Same story reported on several days (different articles, often no shared timeline event):
// merge notes of the same GS paper that share syllabus node + 2 keywords, or most headline words.
const STOP = new Set(['about', 'after', 'again', 'against', 'along', 'amid', 'among', 'before', 'being', 'between',
  'could', 'during', 'from', 'have', 'into', 'more', 'over', 'said', 'says', 'such', 'than', 'that', 'their', 'there',
  'these', 'they', 'this', 'those', 'under', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'will', 'would',
  'india', 'indian', 'government', 'centre', 'state', 'states', 'news', 'today', 'live', 'updates', 'update', 'year'])
// crude stemming so 'review' / 'reviewing' / 'reviews' count as the same word
const stem = (w: string) => w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w
const words = (t: string) => new Set((t.toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter(w => !STOP.has(w)).map(stem))
const kws = (it: UpscItem) => new Set(it.keywords.map(k => k.toLowerCase().trim()).filter(Boolean))
const shared = (a: Set<string>, b: Set<string>) => { let n = 0; a.forEach(x => { if (b.has(x)) n++ }); return n }

function sameStory(a: UpscItem, b: UpscItem): boolean {
  if (a.paper !== b.paper) return false
  if (a.node === b.node && shared(kws(a), kws(b)) >= 2) return true
  const jac = (x: Set<string>, y: Set<string>) => { const s = shared(x, y), u = x.size + y.size - s; return { s, j: u ? s / u : 0 } }
  const t = jac(words(a.title), words(b.title))
  if (t.s >= 3 && t.j >= 0.3) return true
  // Same event told differently (e.g. two reports of one phone call): compare headline + 'why in news',
  // only for notes a few days apart.
  if (Math.abs(a.publishedAt - b.publishedAt) > 4 * DAY) return false
  const w = jac(words(`${a.title} ${a.whyInNews}`), words(`${b.title} ${b.whyInNews}`))
  return w.s >= 5 && w.j >= 0.22
}

function mergeStories(items: UpscItem[]): UpscItem[] {
  const kept: UpscItem[] = []
  for (const it of [...items].sort(byImportance)) {
    const twin = kept.find(k => sameStory(k, it))
    if (twin) twin.related += it.related + 1
    else kept.push({ ...it })
  }
  return kept
}

/** Best notes first, but no single subject crowds out the rest of the syllabus. */
function pickBalanced(items: UpscItem[], cap: number): UpscItem[] {
  const sorted = [...items].sort(byImportance)
  const perSubject = Math.max(3, Math.ceil(cap * SUBJECT_SHARE))
  const count = new Map<string, number>()
  const picked: UpscItem[] = [], rest: UpscItem[] = []
  for (const it of sorted) {
    const n = count.get(it.subject) || 0
    if (picked.length < cap && n < perSubject) { picked.push(it); count.set(it.subject, n + 1) }
    else rest.push(it)
  }
  for (const it of rest) { if (picked.length >= cap) break; picked.push(it) }
  return picked
}

const LIVE_BLOG = /\blive(\s+updates?|\s+blog)?\b\s*[:|-]|\blive updates\b/i

const subjectOrder = Object.keys(UPSC_SYLLABUS)
const byImportance = (a: UpscItem, b: UpscItem) =>
  b.score - a.score || b.related - a.related || b.publishedAt - a.publishedAt

export async function buildReport(period: Period, lang: Language): Promise<Report | null> {
  const isHi = lang === 'hi'
  const today = istDayStart()
  const days: number[] = []
  for (let d = period.start; d < period.end && d <= today; d += DAY) days.push(d)
  // Selection is always made on the English notes, so both languages carry the same digest;
  // the Hindi report then uses the Hindi text of the chosen notes that are translated.
  const perDay = await Promise.all(days.map(d => getUpscDay(d, 'en')))
  const caps = CAPS[period.kind]
  let pool = perDay.flat()
  if (period.kind !== 'daily') {
    pool = mergeStories(dedupeAcrossDays(pool).filter(i => !LIVE_BLOG.test(i.title)))
  }
  const totalNotes = pool.length
  if (!totalNotes) return null
  let chosen = period.kind === 'daily' ? [...pool].sort(byImportance) : pickBalanced(pool, caps.notes)

  let hiShare = 1
  if (isHi) {
    const perDayHi = await Promise.all(days.map(d => getUpscDay(d, 'hi')))
    const hiById = new Map(perDayHi.flat().map(i => [i.articleId, i]))
    const translated = chosen
      .map(en => { const h = hiById.get(en.articleId); return h?.hi ? { ...h, related: en.related } : null })
      .filter((x): x is UpscItem => !!x)
    hiShare = translated.length / chosen.length
    chosen = translated
    if (!chosen.length) return null
  }
  const within = period.kind === 'daily' ? byImportance : (a: UpscItem, b: UpscItem) => a.publishedAt - b.publishedAt

  const groups: ReportGroup[] = []
  for (const paper of UPSC_PAPERS) {
    const inPaper = chosen.filter(i => i.paper === paper)
    if (!inPaper.length) continue
    const subjects = Array.from(new Set(inPaper.map(i => i.subject)))
      .sort((a, b) => (subjectOrder.indexOf(a) + 1 || 99) - (subjectOrder.indexOf(b) + 1 || 99))
      .map(subject => ({ subject, items: inPaper.filter(i => i.subject === subject).sort(within) }))
    groups.push({ paper, subjects, count: inPaper.length })
  }

  const top = chosen.filter(i => i.score >= 4).slice(0, caps.top)
  const mains = chosen.filter(i => i.mainsQuestion).slice(0, caps.mains)
  const revision: RevisionPoint[] = []
  for (const it of chosen) {
    for (const p of it.pointers.slice(0, 3)) {
      if (revision.length >= caps.revision) break
      if (p?.text) revision.push({ ...p, articleId: it.articleId })
    }
  }

  const hash = crypto.createHash('sha256').update(JSON.stringify({
    v: REPORT_VERSION, k: period.kind, p: period.key, lang,
    n: chosen.map(i => [i.articleId, i.title, i.whyInNews, i.factBox, i.pointers, i.mainsQuestion, i.paper, i.subject, i.node, i.examType, i.related]),
  })).digest('hex').slice(0, 24)

  return {
    period, lang,
    title: reportTitle(period, isHi),
    label: periodLabel(period, isHi),
    groups, top, mains, revision,
    totalNotes, selected: chosen.length,
    hiShare,
    updatedAt: Math.max(...chosen.map(i => i.publishedAt)),
    hash,
  }
}

/** Hindi reports are published only once most of the period's notes are in Hindi. */
export const reportPublishable = (r: Report | null) => !!r && (r.lang !== 'hi' || r.hiShare >= HI_READY)

// ---------------------------------------------------------------- periods that have notes

export type AvailablePeriods = { daily: Period[]; weekly: Period[]; monthly: Period[] }

export async function availablePeriods(): Promise<AvailablePeriods> {
  const days = await getUpscDays()
  const out: AvailablePeriods = { daily: [], weekly: [], monthly: [] }
  const seen = new Set<string>()
  for (const d of days) {
    for (const kind of REPORT_KINDS) {
      const key = kind === 'daily' ? d.day : periodKeyFor(kind, d.start + 6 * 3600)
      if (seen.has(`${kind}:${key}`)) continue
      seen.add(`${kind}:${key}`)
      const p = parsePeriod(kind, key)
      if (p) out[kind].push(p)
    }
  }
  return out // newest first (getUpscDays is newest first)
}

// ---------------------------------------------------------------- stored PDFs

export type ReportFile = { key: string; hash: string; items: number; bytes: number; updatedAt: number }

/** Which PDFs exist (UPSC DB, written by the report builder job). Small table, cached. */
export const getReportFiles = () =>
  unstable_cache(async () => {
    const out: Record<string, ReportFile> = {}
    if (!upscDb) return out
    try {
      const r = await upscDb.execute(`SELECT key, hash, items, bytes, updated_at FROM upsc_reports`)
      r.rows.forEach(x => {
        out[String(x.key)] = {
          key: String(x.key), hash: String(x.hash), items: Number(x.items),
          bytes: Number(x.bytes), updatedAt: Number(x.updated_at),
        }
      })
    } catch {
      // table not created yet: no PDFs
    }
    return out
  }, ['upsc-report-files'], { revalidate: 900, tags: ['upsc', 'upsc-reports'] })()

export async function readReportPdf(fileKey: string): Promise<Buffer | null> {
  if (!upscDb) return null
  try {
    const r = await upscDb.execute({ sql: `SELECT data FROM upsc_report_chunks WHERE key = ? ORDER BY n`, args: [fileKey] })
    if (!r.rows.length) return null
    return Buffer.concat(r.rows.map(x => Buffer.from(x.data as ArrayBuffer)))
  } catch {
    return null
  }
}

export const pdfFileName = (kind: ReportKind, key: string, lang: Language) =>
  `SatyaDheesh-UPSC-${kind === 'daily' ? 'Daily' : kind === 'weekly' ? 'Weekly' : 'Monthly'}-Current-Affairs-${key}${lang === 'hi' ? '-Hindi' : ''}.pdf`
