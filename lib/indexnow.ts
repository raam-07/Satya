import { db } from './db'
import sitemap from '@/app/sitemap'
import { selectDueUrls, type SubmittedRecord } from './indexnowSelect'

/**
 * IndexNow: tell Bing (and every engine sharing the protocol - Yandex, Seznam,
 * Naver, Yep) the moment a page is new or has changed, instead of waiting for
 * them to recrawl. ChatGPT search draws on Bing, so this is also the fastest
 * route for new promises and timelines to become citable there.
 *
 * The key is not a secret. It is published at /500bc0d9358b06be47e5da6f0d8c8d95.txt so the engines can
 * confirm this site owns the key. It must match public/500bc0d9358b06be47e5da6f0d8c8d95.txt exactly.
 */
export const INDEXNOW_KEY = '500bc0d9358b06be47e5da6f0d8c8d95'

const HOST = 'satyadheesh.in'
const SITE = `https://${HOST}`
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS_PER_REQUEST = 10_000
const REQUEST_TIMEOUT_MS = 20_000

const STATUS_MEANING: Record<number, string> = {
  200: 'Accepted.',
  202: 'Received; the engines are still verifying the key. Normal on the first submissions.',
  400: 'Bad request - the payload was malformed.',
  403: 'Key rejected - the key file is missing or does not match. Check /500bc0d9358b06be47e5da6f0d8c8d95.txt is live.',
  422: 'URLs rejected - they do not belong to this host, or the key does not match.',
  429: 'Rate limited - too many submissions. The next run will retry.',
}

export interface IndexNowResult {
  ok: boolean
  dryRun: boolean
  totalUrls: number
  due: number
  submitted: number
  status?: number
  meaning?: string
  sample?: string[]
  error?: string
}

let ensured: Promise<void> | null = null

function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(
        `CREATE TABLE IF NOT EXISTS indexnow_urls (
           url          TEXT PRIMARY KEY,
           lastmod      INTEGER NOT NULL,
           submitted_at INTEGER NOT NULL
         )`
      )
      .then(() => undefined)
      .catch((err) => {
        ensured = null
        throw err
      })
  }
  return ensured
}

async function loadSubmitted(): Promise<Map<string, SubmittedRecord>> {
  const res = await db.execute('SELECT url, lastmod, submitted_at FROM indexnow_urls')
  const known = new Map<string, SubmittedRecord>()
  for (const row of res.rows || []) {
    known.set(String((row as any).url), {
      lastmod: Number((row as any).lastmod),
      submittedAt: Number((row as any).submitted_at),
    })
  }
  return known
}

async function markSubmitted(items: Array<{ url: string; lastmod: number }>, at: number) {
  const CHUNK = 200
  for (let i = 0; i < items.length; i += CHUNK) {
    const stmts = items.slice(i, i + CHUNK).map((it) => ({
      sql: `INSERT INTO indexnow_urls (url, lastmod, submitted_at) VALUES (?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET lastmod = excluded.lastmod, submitted_at = excluded.submitted_at`,
      args: [it.url, it.lastmod, at],
    }))
    await db.batch(stmts, 'write')
  }
}

async function postToIndexNow(urlList: string[]): Promise<number> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      cache: 'no-store',
      signal: controller.signal,
    })
    return res.status
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Submit every indexable URL that is new or changed since it was last
 * submitted. The sitemap is the single source of truth for which URLs exist
 * and when they changed, so IndexNow can never disagree with it.
 *
 * Only URLs the engines accept are recorded; anything rejected is simply
 * retried on the next run.
 */
export async function submitChangedUrls(opts: { dryRun?: boolean; force?: boolean } = {}): Promise<IndexNowResult> {
  const { dryRun = false, force = false } = opts

  await ensureTable()
  const entries = await sitemap()
  const now = Date.now()
  const known = force ? new Map<string, SubmittedRecord>() : await loadSubmitted()
  const due = selectDueUrls(entries as any, known, now)

  const base: IndexNowResult = {
    ok: true,
    dryRun,
    totalUrls: entries.length,
    due: due.length,
    submitted: 0,
    sample: due.slice(0, 10).map((d) => d.url),
  }

  if (dryRun || due.length === 0) return base

  for (let i = 0; i < due.length; i += MAX_URLS_PER_REQUEST) {
    const chunk = due.slice(i, i + MAX_URLS_PER_REQUEST)
    let status: number
    try {
      status = await postToIndexNow(chunk.map((c) => c.url))
    } catch (err: any) {
      return { ...base, ok: false, error: `Could not reach IndexNow: ${err?.message || err}` }
    }

    if (status !== 200 && status !== 202) {
      return {
        ...base,
        ok: false,
        status,
        meaning: STATUS_MEANING[status] || 'Unexpected response from IndexNow.',
      }
    }

    await markSubmitted(chunk, now)
    base.submitted += chunk.length
    base.status = status
    base.meaning = STATUS_MEANING[status]
  }

  return base
}
