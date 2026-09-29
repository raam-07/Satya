import { api } from '@/lib/api'
import type { PoliticalPromise } from '@/lib/api'
import Link from 'next/link'
import { PBadge } from '@/components/SrcTag'
import { PromiseShare } from '@/components/PromiseShare'
import { slugify } from '@/lib/utils'
import { JsonLd, makeBreadcrumbJsonLd } from '@/components/JsonLd'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

const VERDICT_LABEL: Record<string, string> = {
  kept: 'Kept',
  broken: 'Broken',
  ongoing: 'Ongoing',
  void: 'Void',
}

/** Shorten at a word boundary so a trimmed promise still reads as words. */
function truncateAtWord(text: string, max: number): string {
  const t = (text || '').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:\u2013\u2014-]+$/, '') + '\u2026'
}

const HINDI_VERDICT_LABEL: Record<string, string> = {
  kept: 'पूरा हुआ',
  broken: 'टूटा',
  ongoing: 'प्रक्रिया में',
  void: 'शून्य',
}

export const revalidate = false

export async function generateMetadata({ params, searchParams }: { params: { id: string }; searchParams?: { lang?: string } }): Promise<Metadata> {
  const promiseId = decodeURIComponent(params.id)
  const isHi = searchParams?.lang === 'hi'
  const data = await api.promises()
  const allPromises: PoliticalPromise[] = [
    ...(data?.by_status?.broken  ?? []),
    ...(data?.by_status?.ongoing ?? []),
    ...(data?.by_status?.kept    ?? []),
    ...(data?.by_status?.void   ?? []),
  ]
  const promise = allPromises.find(p => String(p.id) === promiseId)

  if (!promise) {
    return {
      title: isHi ? 'वादा नहीं मिला | SatyaDheesh' : 'Not Found | SatyaDheesh',
      robots: {
        index: false,
      }
    }
  }

  const canonicalId = String(promise.id)
  const verdict = isHi
    ? (HINDI_VERDICT_LABEL[promise.status ?? ''] ?? 'प्रक्रिया में')
    : (VERDICT_LABEL[promise.status ?? ''] ?? 'Ongoing')

  // Results show roughly 60 characters of a title. Spend them on what people
  // actually search for - the promise, who made it, and the verdict - so if
  // anything gets trimmed it is the brand suffix, not the words that matter.
  const tail = ` — ${promise.person}: ${verdict}`
  const promiseBudget = Math.max(25, 60 - tail.length - 2)
  const title = `"${truncateAtWord(promise.promise ?? '', promiseBudget)}"${tail} | SatyaDheesh`

  // Lead with the verdict so it survives however long the promise is.
  const descLead = isHi
    ? `फैसला: ${verdict}। ${promise.person} ने वादा किया था: `
    : `Verdict: ${verdict}. ${promise.person} promised `
  const descTail = isHi
    ? `। सत्याधीश पर इस फैसले के पीछे के साक्ष्य देखें।`
    : `. See the sourced evidence behind the verdict on SatyaDheesh.`
  const descBudget = Math.max(40, 155 - descLead.length - descTail.length - 2)
  const description = `${descLead}"${truncateAtWord(promise.promise ?? '', descBudget)}"${descTail}`

  const canonicalUrl = isHi
    ? `https://satyadheesh.in/vaade/${canonicalId}?lang=hi`
    : `https://satyadheesh.in/vaade/${canonicalId}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-IN': `https://satyadheesh.in/vaade/${canonicalId}`,
        'hi-IN': `https://satyadheesh.in/vaade/${canonicalId}?lang=hi`,
        'x-default': `https://satyadheesh.in/vaade/${canonicalId}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: [
        {
          url: `https://satyadheesh.in/vaade/${canonicalId}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `Promise from ${promise.person}: ${promise.status}`,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`https://satyadheesh.in/vaade/${canonicalId}/opengraph-image`],
    }
  }
}


// ─── Presentation ────────────────────────────────────────────────────────────

const TONE: Record<string, { color: string; word: string; sub: string }> = {
  kept:    { color: '#1B7050', word: 'Kept',    sub: 'Delivered, according to the evidence' },
  broken:  { color: '#B02828', word: 'Broken',  sub: 'Not delivered, according to the evidence' },
  ongoing: { color: '#BF4A07', word: 'Ongoing', sub: 'No final verdict yet' },
  void:    { color: '#6B7280', word: 'Void',    sub: 'Cannot be judged' },
}

// What each kind of evidence actually shows. The pipeline tags articles this
// way; saying so stops a report of the promise being MADE from reading as
// proof that it was kept or broken.
const EVIDENCE_KIND: Record<string, string> = {
  outcome: 'Outcome report',
  progress: 'Progress report',
  declaration: 'Reported the promise',
  legacy_unclassified: 'Coverage',
}

interface Editorial {
  record?: string | null
  summary?: string | null
  promise_quote?: string | null
  promise_quote_source?: string | null
  /** Set when the quote is an outlet's English rendering of words spoken in another language. */
  promise_quote_translated?: boolean
  /** Editor decision that keeps the pipeline from changing the verdict. */
  verdict_locked?: boolean
  /** The person's role when the promise was made, if it differs from their current role. */
  role_at_promise?: string
  verdict_reason?: string
  sources?: Array<{ title?: string; url: string; publisher?: string; date?: string }>
  verified_on?: string
}

interface EvidenceItem {
  title?: string
  url?: string
  source?: string
  source_domain?: string
  scraped_at?: string
  /** Publication date, known only for editor-verified sources. */
  published?: string | null
  supporting_quote?: string
  quote_verified?: boolean
  evidence_type?: string
  url_status?: string
  archived_url?: string
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const v = String(value).trim()
  // A bare year as a deadline means "by the end of that year".
  const d = /^\d{4}$/.test(v) ? new Date(`${v}-12-31T00:00:00Z`) : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function fmtDate(value?: string | null): string {
  const d = parseDate(value)
  if (!d) return value ? String(value) : ''
  if (/^\d{4}$/.test(String(value).trim())) return String(value).trim()
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function monthsBetween(from: Date, to: Date): number {
  let m = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  if (to.getUTCDate() < from.getUTCDate()) m -= 1
  return Math.max(0, m)
}

function spanText(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = []
  if (y) parts.push(`${y} year${y === 1 ? '' : 's'}`)
  if (m) parts.push(`${m} month${m === 1 ? '' : 's'}`)
  return parts.join(', ') || 'Under a month'
}

function agoText(from: Date, now: Date): string {
  const m = monthsBetween(from, now)
  if (m >= 12) {
    const y = Math.floor(m / 12)
    return `${y} year${y === 1 ? '' : 's'} ago`
  }
  if (m >= 1) return `${m} month${m === 1 ? '' : 's'} ago`
  return 'this month'
}

function hostOf(url?: string): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
}

function clip(text: string | undefined | null, max: number): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const sp = cut.lastIndexOf(' ')
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–—-]+$/, '') + '…'
}

function headlineSize(len: number): string {
  if (len <= 60) return 'text-[30px] leading-[1.12] md:text-[42px]'
  if (len <= 110) return 'text-[25px] leading-[1.18] md:text-[34px]'
  return 'text-[21px] leading-[1.25] md:text-[27px]'
}

function Section({
  title,
  meta,
  open = false,
  children,
}: {
  title: string
  meta?: string
  open?: boolean
  children: React.ReactNode
}) {
  // Native <details>: the reader chooses what to open, it needs no JavaScript,
  // and its content stays in the HTML where search and AI crawlers can read it.
  return (
    <details open={open} className="group border-b" style={{ borderColor: 'var(--border)' }}>
      <summary className="flex items-center gap-3 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
        <span className="text-[10.5px] font-mono font-semibold tracking-[0.16em] uppercase text-[var(--text1)]">{title}</span>
        {meta && <span className="text-[10.5px] font-mono tracking-wide text-[var(--text3)]">{meta}</span>}
        <span
          className="ml-auto w-6 h-6 flex items-center justify-center border rounded-full transition-transform group-open:rotate-45 text-[var(--text2)]"
          style={{ borderColor: 'var(--border-md)' }}
          aria-hidden="true"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 1.5v9M1.5 6h9" />
          </svg>
        </span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PromisePage({ params }: { params: { id: string } }) {
  const promiseId = decodeURIComponent(params.id)
  const { serverApi } = await import('@/lib/api.server')

  const [promise, summary] = await Promise.all([serverApi.promiseDetail(promiseId), api.promises()])
  if (!promise) notFound()
  const hasProfile = await serverApi.isKnownPolitician(promise.person)

  const canonicalId = String(promise.id)
  if (promiseId !== canonicalId) permanentRedirect(`/vaade/${canonicalId}`)

  const now = new Date()
  const status: string = promise.status || 'ongoing'
  const tone = TONE[status] ?? TONE.ongoing
  const editorial: Editorial = promise.editorial || {}
  const pageUrl = `https://satyadheesh.in/vaade/${canonicalId}`
  // The pipeline's placeholders are not facts about the person; leave them off the page.
  const knownParty = promise.party && !/unconfirmed/i.test(promise.party) && promise.party.length <= 40 ? promise.party : null
  // An editor's role-at-the-time wins over the pipeline's current role.
  const knownRole = editorial.role_at_promise || (promise.role && promise.role !== 'Politician' ? promise.role : null)

  // Evidence: verified sources first, then the pipeline's articles, one per URL.
  // The article that merely reports the promise being made is shown under
  // "What was promised", not counted as evidence of the outcome.
  // The page the promise quote was copied from is shown with the quote instead.
  const seen = new Set<string>([promise.source_url, editorial.promise_quote_source].filter(Boolean) as string[])
  const quoteSource = editorial.promise_quote_source
    ? (editorial.sources || []).find((s) => s.url === editorial.promise_quote_source)
    : undefined
  const evidence: Array<EvidenceItem & { verified?: boolean }> = []
  for (const s of editorial.sources || []) {
    if (!s?.url || seen.has(s.url)) continue
    seen.add(s.url)
    evidence.push({ title: s.title, url: s.url, source: s.publisher, published: s.date, verified: true })
  }
  for (const e of (promise.evidence_articles || []) as EvidenceItem[]) {
    if (!e?.url || seen.has(e.url)) continue
    seen.add(e.url)
    evidence.push(e)
  }
  const outcomeCount = evidence.filter((e) => e.verified || (e.evidence_type && e.evidence_type !== 'declaration')).length

  // Time is the hook for a promise with no verdict: how long it has been open.
  // A promise with no deadline is judged 3 years after it was made, and marked
  // kept only after 5 years of monitoring (promise_rules.py in the tracker).
  const made = parseDate(promise.made_on)
  const hasDeadline = Boolean(promise.deadline) && !['ongoing', 'none', 'null', 'n/a'].includes(String(promise.deadline).toLowerCase())
  const impliedDue = !hasDeadline
    ? parseDate(promise.implied_deadline) ?? (made ? new Date(Date.UTC(made.getUTCFullYear() + 3, made.getUTCMonth(), made.getUTCDate())) : null)
    : null
  const due = hasDeadline ? parseDate(promise.deadline) : impliedDue
  const dueLabel = hasDeadline ? `the ${fmtDate(promise.deadline)} deadline` : due ? `${fmtDate(due.toISOString().slice(0, 10))}, 3 years after it was made` : ''
  const monitoring = promise.monitoring as { since?: string } | undefined
  const monitoredUntil = made ? new Date(Date.UTC(made.getUTCFullYear() + 5, made.getUTCMonth(), made.getUTCDate())) : null
  let clock: { big: string; small: string } | null = null
  if (status === 'ongoing') {
    if (monitoring && monitoredUntil) {
      clock = {
        big: spanText(monthsBetween(now, monitoredUntil)),
        small: `delivered · monitored until ${fmtDate(monitoredUntil.toISOString().slice(0, 10))} before it can be marked kept`,
      }
    } else if (due && due > now) {
      clock = { big: spanText(monthsBetween(now, due)), small: `left until ${dueLabel}` }
    } else if (due && due <= now) {
      clock = { big: spanText(monthsBetween(due, now)), small: `past ${dueLabel}, still no verdict` }
    } else if (made) {
      clock = { big: spanText(monthsBetween(made, now)), small: 'since it was promised · no deadline was set' }
    }
  }

  // Why this verdict: the reviewed write-up if there is one, otherwise the best
  // automated explanation, clearly labelled as such.
  const automated =
    (promise.notes && promise.notes.length >= 80 ? promise.notes : null) ||
    promise.qwen_reasoning ||
    promise.gemma_reasoning ||
    null
  const whyIsReviewed = Boolean(editorial.summary)
  const why = editorial.summary || (automated ? clip(automated, 600) : null)
  const whyOpen = whyIsReviewed || (why ? why.length <= 320 : false)

  const history = [...(promise.status_history || [])].sort(
    (a: any, b: any) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  )

  // More from the same leader: settled verdicts first, then critical promises.
  const rank = (p: any) =>
    (p.status === 'broken' ? 0 : p.status === 'kept' ? 1 : p.importance === 'critical' ? 2 : p.status === 'ongoing' ? 3 : 4)
  const allLight: any[] = [
    ...(summary?.by_status?.broken ?? []),
    ...(summary?.by_status?.kept ?? []),
    ...(summary?.by_status?.ongoing ?? []),
    ...(summary?.by_status?.void ?? []),
  ]
  const byLeader = allLight.filter((p) => p.person === promise.person)
  const moreFromLeader = byLeader.filter((p) => String(p.id) !== canonicalId).sort((a, b) => rank(a) - rank(b)).slice(0, 4)

  const shareText = `"${clip(promise.promise, 120)}" — ${promise.person}: ${tone.word.toUpperCase()}. See the record:`
  // Whichever is more recent: the pipeline's last review or the editor's fact-check.
  const reviewed = [promise.status_last_reviewed, editorial.verified_on].filter(Boolean).sort().pop()

  // ── Structured data (unchanged) ──
  const breadcrumbData = makeBreadcrumbJsonLd([
    { name: 'Home', item: 'https://satyadheesh.in/' },
    { name: 'Vaade', item: 'https://satyadheesh.in/vaade' },
    { name: `Promise #${canonicalId}`, item: pageUrl },
  ])
  const RATING_MAP: Record<string, number> = { kept: 5, ongoing: 3, void: 2, broken: 1 }
  const claimReviewData = {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: pageUrl,
    author: { '@type': 'Organization', name: 'SatyaDheesh', url: 'https://satyadheesh.in' },
    claimReviewed: promise.promise,
    itemReviewed: {
      '@type': 'Claim',
      author: { '@type': 'Person', name: promise.person, jobTitle: knownRole || 'Political Leader' },
      datePublished: promise.made_on || undefined,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: RATING_MAP[status] || 3,
      bestRating: 5,
      worstRating: 1,
      alternateName: status,
    },
  }

  return (
    <article className="md:max-w-3xl md:mx-auto">
      <JsonLd data={breadcrumbData} />
      <JsonLd data={claimReviewData} />

      {/* ═══ The hook ═══ */}
      <header className="px-4 md:px-8 pt-5 pb-7 bg-[var(--surface)] border-b" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/vaade" className="text-[10px] font-mono tracking-[0.18em] uppercase text-[var(--text3)] hover:text-[var(--text1)]">
            ← All promises
          </Link>
          {promise.importance === 'critical' && (
            <span className="text-[9.5px] font-mono font-semibold tracking-[0.16em] uppercase px-2 py-[3px] border rounded-sm" style={{ color: 'var(--red)', borderColor: 'rgba(176,40,40,0.35)' }}>
              Critical promise
            </span>
          )}
        </div>

        {/* Verdict */}
        <div className="mt-6 flex items-stretch gap-3">
          <div className="w-[5px] rounded-full flex-shrink-0" style={{ background: tone.color }} />
          <div>
            <div className="font-display font-black uppercase leading-none tracking-[0.06em] text-[44px] md:text-[56px]" style={{ color: tone.color }}>
              {tone.word}
            </div>
            <div className="mt-2 text-[11px] font-mono leading-relaxed text-[var(--text2)]">
              {status === 'ongoing' && monitoring ? 'Delivered, still being monitored' : tone.sub}
              {reviewed && <> · as of {fmtDate(reviewed)}</>}
              {status !== 'ongoing' && outcomeCount > 0 && (
                <> · based on {outcomeCount} report{outcomeCount === 1 ? '' : 's'}</>
              )}
            </div>
          </div>
        </div>

        {/* The promise */}
        {promise.category && (
          <div className="mt-7 text-[10px] font-mono font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--accent)' }}>
            {promise.category.replace(/_/g, ' ').replace(/\//g, ' / ')}
          </div>
        )}
        <h1 className={`${promise.category ? 'mt-2' : 'mt-7'} font-display font-bold text-[var(--text1)] tracking-[-0.01em] text-balance ${headlineSize((promise.promise || '').length)}`}>
          &ldquo;{promise.promise}&rdquo;
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] font-mono">
          {hasProfile ? (
            <Link href={`/minister/${slugify(promise.person)}`} className="font-semibold text-[var(--text1)] hover:text-[var(--accent)] hover:underline underline-offset-2">
              {promise.person}
            </Link>
          ) : (
            <span className="font-semibold text-[var(--text1)]">{promise.person}</span>
          )}
          {knownParty && <PBadge party={knownParty} verified={promise.party_verified} />}
          {made && (
            <span className="text-[var(--text3)]">
              Promised {fmtDate(promise.made_on)}
              {!clock && <> · {agoText(made, now)}</>}
            </span>
          )}
        </div>

        {/* Open promises: how long it has been */}
        {clock && (
          <div className="mt-6 py-4 border-y" style={{ borderColor: 'var(--border)' }}>
            <div className="font-display font-black text-[30px] md:text-[36px] leading-none text-[var(--text1)] tabular-nums">{clock.big}</div>
            <div className="mt-1.5 text-[10.5px] font-mono tracking-wide uppercase text-[var(--text3)]">{clock.small}</div>
          </div>
        )}

        {/* The record */}
        {editorial.record && (
          <div className="mt-6 pl-4 border-l-[3px]" style={{ borderColor: tone.color }}>
            <div className="text-[9.5px] font-mono font-semibold tracking-[0.2em] uppercase text-[var(--text3)]">
              {status === 'ongoing' ? 'The record so far' : 'The record'}
            </div>
            <p className="mt-1.5 font-serif text-[17px] md:text-[19px] leading-[1.45] text-[var(--text1)]">{editorial.record}</p>
          </div>
        )}

        <div className="mt-7">
          <PromiseShare url={pageUrl} text={shareText} />
        </div>
      </header>

      {/* ═══ The detail, on the reader's terms ═══ */}
      <div className="px-4 md:px-8">
        {why && (
          <Section title={whyIsReviewed ? 'What the record shows' : 'What the evidence says'} open={whyOpen}>
            <p className="font-serif text-[16px] leading-[1.65] text-[var(--text1)] whitespace-pre-line">{why}</p>
            {!whyIsReviewed && (
              <p className="mt-3 text-[10.5px] font-mono text-[var(--text3)]">Automated summary from the evidence — not yet reviewed by an editor.</p>
            )}
          </Section>
        )}

        <Section title="What was promised" meta={promise.source_description ? hostOf(promise.source_url) : undefined}>
          {editorial.promise_quote ? (
            <blockquote className="font-serif italic text-[16px] leading-[1.6] text-[var(--text1)] pl-4 border-l-2" style={{ borderColor: 'var(--border-hi)' }}>
              &ldquo;{editorial.promise_quote}&rdquo;
              <footer className="mt-2 not-italic text-[11px] font-mono text-[var(--text3)]">
                — {promise.person}
                {editorial.promise_quote_source && (
                  <>
                    , as reported{editorial.promise_quote_translated ? ' in English translation' : ''} by{' '}
                    <a href={editorial.promise_quote_source} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline underline-offset-2">
                      {quoteSource?.publisher || hostOf(editorial.promise_quote_source)}
                      {quoteSource?.date ? `, ${fmtDate(quoteSource.date)}` : ''} ↗
                    </a>
                  </>
                )}
              </footer>
            </blockquote>
          ) : (
            <p className="font-serif text-[15px] leading-[1.6] text-[var(--text2)]">
              {promise.person} made this promise{promise.made_on ? ` on ${fmtDate(promise.made_on)}` : ''}
              {knownRole ? `, as ${knownRole}` : ''}. The original report is linked below.
            </p>
          )}

          <div className="mt-4 space-y-2 text-[12px] font-mono">
            {promise.source_url && promise.url_status !== 'dead' && (
              <a href={promise.source_url} target="_blank" rel="noopener noreferrer" className="block text-[var(--accent)] hover:underline underline-offset-2">
                {promise.source_description || 'Original report'} ↗
              </a>
            )}
            {promise.url_status === 'dead' && (
              <div className="text-[var(--text3)]">
                <span className="line-through">{promise.source_description || 'Original report'}</span> — link no longer works
              </div>
            )}
            {promise.archived_url && (
              <a href={promise.archived_url} target="_blank" rel="noopener noreferrer" className="block text-[var(--text2)] hover:text-[var(--accent)] hover:underline underline-offset-2">
                Archived copy ↗
              </a>
            )}
            {promise.url_status === 'dead' && promise.search_fallback_url && (
              <a href={promise.search_fallback_url} target="_blank" rel="noopener noreferrer" className="block text-[var(--accent)] hover:underline underline-offset-2">
                Search for the original ↗
              </a>
            )}
            {hasDeadline && <div className="text-[var(--text3)]">Deadline: {fmtDate(promise.deadline)}</div>}
            {!hasDeadline && due && (status === 'broken' || (status === 'ongoing' && !monitoring)) && (
              <div className="text-[var(--text3)]">
                No deadline was given · judged on {fmtDate(due.toISOString().slice(0, 10))}, 3 years after it was made
              </div>
            )}
            {!hasDeadline && status === 'kept' && (
              <div className="text-[var(--text3)]">No deadline was given · marked kept after at least 5 years of monitoring</div>
            )}
          </div>
        </Section>

        {evidence.length > 0 && (
          <Section title="Evidence" meta={`${evidence.length} report${evidence.length === 1 ? '' : 's'}`}>
            <ol className="space-y-5">
              {evidence.map((e, i) => {
                const outlet = e.source || e.source_domain || hostOf(e.url)
                const kind = e.verified ? 'Verified source' : EVIDENCE_KIND[e.evidence_type || ''] || null
                const link = e.url_status === 'dead' && e.archived_url ? e.archived_url : e.url
                return (
                  <li key={i}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-mono text-[var(--text3)]">
                      {e.published && <span>{fmtDate(e.published)} ·</span>}
                      {outlet && <span>{outlet}</span>}
                      {kind && (
                        <span className="px-1.5 py-[1px] border rounded-sm" style={{ borderColor: 'var(--border-md)' }}>
                          {kind}
                        </span>
                      )}
                    </div>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 block font-serif font-semibold text-[16px] leading-snug text-[var(--text1)] hover:text-[var(--accent)]">
                      {e.title || outlet} ↗
                    </a>
                    {e.quote_verified && e.supporting_quote && (
                      <p className="mt-1 font-serif text-[14px] leading-[1.55] text-[var(--text2)]">{clip(e.supporting_quote, 240)}</p>
                    )}
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        {history.length >= 2 && (
          <Section title="Verdict history" meta={`${history.length} changes`}>
            <ol className="relative ml-2 pl-5 border-l space-y-4" style={{ borderColor: 'var(--border-md)' }}>
              {history.map((h: any, i: number) => {
                const c = (TONE[h.status] ?? TONE.ongoing).color
                return (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 bg-[var(--surface)]" style={{ borderColor: c }} />
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: c }}>{h.status}</span>
                      <span className="text-[10.5px] font-mono text-[var(--text3)]">{fmtDate(h.changed_at)}</span>
                      {h.by === 'editor' && <span className="text-[10.5px] font-mono text-[var(--text3)]">· editor review</span>}
                      {h.by === 'rule' && <span className="text-[10.5px] font-mono text-[var(--text3)]">· no-deadline rule</span>}
                      {h.evidence_url && (
                        <a href={h.evidence_url} target="_blank" rel="noopener noreferrer" className="text-[10.5px] font-mono text-[var(--accent)] hover:underline">
                          evidence ↗
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Section>
        )}
      </div>

      {/* ═══ Keep reading ═══ */}
      {moreFromLeader.length > 0 && (
        <section className="px-4 md:px-8 pt-8 pb-2">
          <h2 className="text-[10.5px] font-mono font-semibold tracking-[0.16em] uppercase text-[var(--text1)]">More from {promise.person}</h2>
          <ul className="mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            {moreFromLeader.map((p) => {
              const t = TONE[p.status] ?? TONE.ongoing
              return (
                <li key={p.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <Link href={`/vaade/${p.id}`} className="flex items-start gap-3 py-3.5 group">
                    <span className="mt-[3px] text-[9px] font-mono font-bold tracking-[0.12em] uppercase w-[62px] flex-shrink-0" style={{ color: t.color }}>
                      {t.word}
                    </span>
                    <span className="font-serif text-[15px] leading-snug text-[var(--text1)] group-hover:text-[var(--accent)]">{p.promise}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {hasProfile && byLeader.length > moreFromLeader.length + 1 && (
            <Link href={`/minister/${slugify(promise.person)}`} className="inline-block mt-3 text-[11px] font-mono text-[var(--accent)] hover:underline underline-offset-2">
              All {byLeader.length} promises by {promise.person} →
            </Link>
          )}
        </section>
      )}

      <footer className="px-4 md:px-8 py-8 flex flex-wrap gap-x-5 gap-y-2 text-[10.5px] font-mono text-[var(--text3)]">
        <Link href="/about#verdicts" className="hover:text-[var(--text1)] hover:underline">How verdicts are decided</Link>
        <a href={`mailto:thesatyadheesh@gmail.com?subject=${encodeURIComponent(`Correction: promise ${canonicalId}`)}`} className="hover:text-[var(--text1)] hover:underline">
          Report an error
        </a>
        {editorial.verified_on && <span>Fact-checked {fmtDate(editorial.verified_on)}</span>}
      </footer>
    </article>
  )
}
