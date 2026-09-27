import type { Metadata } from 'next'
import Link from 'next/link'
import { cleanTitle } from '@/lib/utils'
import { UPSC_SYLLABUS } from '@/lib/upscSyllabus'
import {
  UPSC_PAPERS, getUpscFeed, getUpscStats, getUpscTopPicks, istDayStart, nodeLabel, subjectLabel,
  type UpscFilters, type UpscItem,
} from '@/lib/upsc'

type SP = { paper?: string; subject?: string; exam?: string; page?: string }

export const metadata: Metadata = {
  title: 'UPSC Current Affairs Today — GS-wise Notes, Prelims Pointers & Mains Questions | SatyaDheesh',
  description:
    'Daily UPSC current affairs mapped to the GS syllabus: why in news, facts for Prelims, and Mains questions with answer dimensions. Filter by GS1, GS2, GS3, GS4.',
  alternates: { canonical: 'https://satyadheesh.in/upsc' },
}

const PAPER_HINT: Record<string, string> = {
  GS1: 'History · Society · Geography',
  GS2: 'Polity · Governance · IR',
  GS3: 'Economy · S&T · Environment · Security',
  GS4: 'Ethics',
}

const POINTER_LABEL: Record<string, string> = {
  constitution: 'Constitution', act_bill: 'Act / Bill', scheme: 'Scheme', institution: 'Body',
  report_index: 'Report / Index', place: 'Place', species_environment: 'Environment',
  sci_tech: 'S&T', international_org: 'Intl. org', person_post: 'Post', data_fact: 'Fact',
}

const EXAM_LABEL = { prelims: 'Prelims', mains: 'Mains', both: 'Prelims + Mains' } as const

function href(sp: SP, patch: Partial<SP>) {
  const next: Record<string, string> = {}
  const merged = { ...sp, ...patch }
  for (const [k, v] of Object.entries(merged)) if (v && !(k === 'page' && v === '0')) next[k] = v
  const qs = new URLSearchParams(next).toString()
  return `/upsc${qs ? `?${qs}` : ''}`
}

function dayLabel(ts: number) {
  const today = istDayStart()
  const d = istDayStart(ts)
  if (d === today) return 'Today'
  if (d === today - 86400) return 'Yesterday'
  return new Date(ts * 1000).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

function Chip({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      scroll={false}
      className={`text-[12px] px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${
        active
          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
          : 'bg-[var(--surface)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hi)]'
      }`}
    >
      {children}
    </Link>
  )
}

function Card({ it }: { it: UpscItem }) {
  return (
    <article className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-[var(--text3)] mb-1.5">
        <span className="font-semibold text-[var(--accent)]">{it.paper}</span>
        <span>{subjectLabel(it.subject)} › {nodeLabel(it.subject, it.node)}</span>
        <span className="ml-auto px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>
          {EXAM_LABEL[it.examType] ?? 'Prelims + Mains'}
        </span>
      </div>

      <h3 className="text-[16px] leading-snug font-semibold text-[var(--text1)] m-0">
        <Link href={`/news/${it.articleId}`} className="hover:text-[var(--accent)]">
          {cleanTitle(it.title)}
        </Link>
      </h3>

      <p className="text-[13.5px] text-[var(--text1)] mt-2 mb-0 leading-relaxed">
        <span className="font-semibold">Why in news: </span>{it.whyInNews}
      </p>
      <p className="text-[13px] text-[var(--text2)] mt-1.5 mb-0 leading-relaxed">{it.factBox}</p>

      {it.pointers.length > 0 && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-[12px] font-semibold text-[var(--text1)] select-none">
            Prelims pointers ({it.pointers.length})
          </summary>
          <ul className="mt-2 space-y-1.5 pl-0 list-none">
            {it.pointers.map((p, i) => (
              <li key={i} className="text-[13px] text-[var(--text2)] leading-snug flex gap-2">
                <span className="shrink-0 text-[10px] font-mono uppercase tracking-wide text-[var(--text3)] pt-0.5 w-[78px]">
                  {POINTER_LABEL[p.type] ?? 'Fact'}
                </span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {(it.mainsQuestion || it.mainsDimensions.length > 0) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-[var(--text1)] select-none">
            Mains angle
          </summary>
          {it.mainsQuestion && (
            <p className="text-[13px] italic text-[var(--text1)] mt-2 mb-1 leading-snug">Q. {it.mainsQuestion}</p>
          )}
          {it.mainsDimensions.length > 0 && (
            <ul className="text-[13px] text-[var(--text2)] mt-1 mb-0 pl-4 list-disc space-y-0.5">
              {it.mainsDimensions.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
          {it.keywords.length > 0 && (
            <p className="text-[12px] text-[var(--text3)] mt-2 mb-0">Keywords: {it.keywords.join(' · ')}</p>
          )}
        </details>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-[var(--text3)]">
        {it.source && it.sourceUrl && (
          <a href={it.sourceUrl} target="_blank" rel="noreferrer nofollow" className="hover:text-[var(--accent)]">
            {it.source} ↗
          </a>
        )}
        {it.event && (
          <Link href={`/event/${it.event.slug}`} className="hover:text-[var(--accent)]">
            Chronology for revision →
          </Link>
        )}
        {it.related > 0 && <span>+{it.related} more on this story</span>}
        {it.secondary.map(s => (
          <span key={s.node}>Also {UPSC_SYLLABUS[s.subject]?.paper} · {nodeLabel(s.subject, s.node)}</span>
        ))}
      </div>
    </article>
  )
}

export default async function UPSCPage({ searchParams }: { searchParams: SP }) {
  const sp: SP = {
    paper: (UPSC_PAPERS as readonly string[]).includes(searchParams.paper ?? '') ? searchParams.paper : undefined,
    subject: UPSC_SYLLABUS[searchParams.subject ?? ''] ? searchParams.subject : undefined,
    exam: searchParams.exam === 'prelims' || searchParams.exam === 'mains' ? searchParams.exam : undefined,
    page: String(Math.max(0, Math.min(200, parseInt(searchParams.page ?? '0', 10) || 0))),
  }
  // a subject implies its paper
  if (sp.subject) sp.paper = UPSC_SYLLABUS[sp.subject].paper
  const filters: UpscFilters = { paper: sp.paper, subject: sp.subject, exam: sp.exam, page: Number(sp.page) }
  const unfiltered = !sp.paper && !sp.exam && filters.page === 0

  const [stats, feed, top] = await Promise.all([
    getUpscStats(),
    getUpscFeed(filters),
    unfiltered ? getUpscTopPicks() : Promise.resolve([] as UpscItem[]),
  ])

  const subjects = sp.paper ? Object.entries(UPSC_SYLLABUS).filter(([, s]) => s.paper === sp.paper) : []

  // group feed by IST day
  const groups: { label: string; items: UpscItem[] }[] = []
  for (const it of feed.items) {
    const label = dayLabel(it.publishedAt)
    if (groups[groups.length - 1]?.label !== label) groups.push({ label, items: [] })
    groups[groups.length - 1].items.push(it)
  }

  return (
    <div className="md:max-w-3xl md:mx-auto pb-10">
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">For aspirants</span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1 mb-0">
          UPSC Current Affairs
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1 mb-0">
          Only the news that matters for the exam, mapped to the GS syllabus.
          <span className="font-mono text-[11px] text-[var(--text3)]">
            {' '}· {stats.today} today · {stats.week} this week
          </span>
        </p>
      </div>

      <div className="px-4 md:px-6 space-y-4 mt-4">
        {top.length > 0 && (
          <section className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--bg-alt)]" style={{ borderColor: 'var(--border-md)' }}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">
              If you read only {top.length}
            </h2>
            <ol className="m-0 pl-5 space-y-2">
              {top.map(t => (
                <li key={t.articleId} className="text-[14px] text-[var(--text1)] leading-snug">
                  <Link href={`/news/${t.articleId}`} className="font-semibold hover:text-[var(--accent)]">
                    {cleanTitle(t.title)}
                  </Link>
                  <span className="block text-[12px] text-[var(--text3)] font-mono mt-0.5">
                    {t.paper} · {nodeLabel(t.subject, t.node)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <Chip to={href(sp, { paper: undefined, subject: undefined, page: '0' })} active={!sp.paper}>All papers</Chip>
            {UPSC_PAPERS.map(p => (
              <Chip key={p} to={href(sp, { paper: p, subject: undefined, page: '0' })} active={sp.paper === p}>
                {p}
                {stats.papers[p] ? <span className="opacity-60"> · {stats.papers[p]}</span> : null}
              </Chip>
            ))}
          </div>
          {sp.paper && (
            <p className="text-[11px] text-[var(--text3)] m-0">{PAPER_HINT[sp.paper]} · counts are last 7 days</p>
          )}
          {subjects.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <Chip to={href(sp, { subject: undefined, page: '0' })} active={!sp.subject}>All {sp.paper}</Chip>
              {subjects.map(([key, s]) => (
                <Chip key={key} to={href(sp, { subject: key, page: '0' })} active={sp.subject === key}>{s.label}</Chip>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <Chip to={href(sp, { exam: undefined, page: '0' })} active={!sp.exam}>Prelims + Mains</Chip>
            <Chip to={href(sp, { exam: 'prelims', page: '0' })} active={sp.exam === 'prelims'}>Prelims facts</Chip>
            <Chip to={href(sp, { exam: 'mains', page: '0' })} active={sp.exam === 'mains'}>Mains analysis</Chip>
          </div>
        </section>

        {feed.items.length === 0 ? (
          <p className="text-center text-[13px] text-[var(--text3)] py-12">
            {filters.page > 0 ? 'No more notes.' : 'No notes yet for this filter. New items are added through the day.'}
          </p>
        ) : (
          groups.map(g => (
            <section key={g.label} className="space-y-3">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 pt-2">{g.label}</h2>
              {g.items.map(it => (
                <Card key={it.articleId} it={it} />
              ))}
            </section>
          ))
        )}

        {(filters.page > 0 || feed.hasNext) && (
          <nav className="flex justify-between text-[13px] pt-2">
            {filters.page > 0 ? (
              <Link href={href(sp, { page: String(filters.page - 1) })} className="text-[var(--accent)]">← Newer</Link>
            ) : <span />}
            {feed.hasNext && (
              <Link href={href(sp, { page: String(filters.page + 1) })} className="text-[var(--accent)]">Older →</Link>
            )}
          </nav>
        )}

        <p className="text-[11px] text-[var(--text3)] leading-relaxed pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          Notes are generated automatically from SatyaDheesh&apos;s news feed and mapped to the UPSC CSE syllabus.
          Always check facts, Articles and figures against the original report or PIB before using them in an answer.
        </p>
      </div>
    </div>
  )
}
