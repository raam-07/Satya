/**
 * Decides which URLs IndexNow should be told about. Pure - no I/O - so the
 * rules can be tested on their own.
 *
 * A URL is due when:
 *   - it has never been submitted, or
 *   - its lastModified moved forward since we last submitted it.
 *
 * Listing pages (home, party, state, topic, index pages) take their date from
 * the newest article, so they "change" every time a story lands. Submitting
 * them on every run would look like spam to the engines, so they go out at
 * most once a day. Detail pages - promises, timelines, politicians - go out as
 * soon as they change, because that is where the new content actually is.
 */

export interface SitemapEntry {
  url: string
  lastModified?: string | Date
}

export interface SubmittedRecord {
  lastmod: number
  submittedAt: number
}

export const LISTING_MIN_GAP_MS = 24 * 60 * 60 * 1000

const DETAIL_PREFIXES = ['/vaade/', '/event/', '/minister/']

export function isDetailUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname
    return DETAIL_PREFIXES.some((p) => path.startsWith(p))
  } catch {
    return false
  }
}

function toMs(value: string | Date | undefined, fallback: number): number {
  if (value === undefined || value === null) return fallback
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : fallback
}

export function selectDueUrls(
  entries: SitemapEntry[],
  known: Map<string, SubmittedRecord>,
  now: number
): Array<{ url: string; lastmod: number }> {
  const due: Array<{ url: string; lastmod: number }> = []
  const seen = new Set<string>()

  for (const entry of entries) {
    if (!entry?.url || seen.has(entry.url)) continue
    seen.add(entry.url)

    const lastmod = toMs(entry.lastModified, now)
    const prev = known.get(entry.url)

    if (!prev) {
      due.push({ url: entry.url, lastmod })
      continue
    }
    if (lastmod <= prev.lastmod) continue
    if (!isDetailUrl(entry.url) && now - prev.submittedAt < LISTING_MIN_GAP_MS) continue

    due.push({ url: entry.url, lastmod })
  }

  return due
}
