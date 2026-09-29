import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getLanguage, LANG_COOKIE, Language } from '@/lib/i18n'
import { cleanTitle } from '@/lib/utils'
import { UPSC_SYLLABUS } from '@/lib/upscSyllabus'
import {
  UPSC_PAPERS, getUpscFeed, getUpscStats, getUpscTopPicks, istDayStart, nodeLabel, subjectLabel,
  type UpscFilters, type UpscItem,
} from '@/lib/upsc'
import { UpscNavChip } from '@/components/UpscNavChip'

type SP = { paper?: string; subject?: string; exam?: string; page?: string; lang?: string }

export const revalidate = false

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const cookieStore = cookies()
  const lang: Language = getLanguage(cookieStore.get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'

  const paper = searchParams?.paper?.toUpperCase()
  const exam = searchParams?.exam?.toLowerCase()

  let pageTitle = isHi
    ? 'यूपीएससी करेंट अफेयर्स — GS Notes, Prelims Pointers & Mains Questions | SatyaDheesh'
    : 'UPSC Current Affairs Today — GS-wise Notes, Prelims Pointers & Mains Questions | SatyaDheesh'
  let pageDesc = isHi
    ? 'GS पाठ्यक्रम से जुड़े दैनिक यूपीएससी करेंट अफेयर्स: चर्चा में क्यों, Prelims के तथ्य और उत्तर आयामों के साथ Mains के प्रश्न।'
    : 'Daily UPSC current affairs mapped to the GS syllabus: why in news, facts for Prelims, and Mains questions with answer dimensions. Filter by GS1, GS2, GS3, GS4.'

  let queryParam = ''
  if (paper && ['GS1', 'GS2', 'GS3', 'GS4'].includes(paper)) {
    queryParam = `paper=${paper}`
    const hint = PAPER_HINT[paper]
    pageTitle = isHi
      ? `UPSC ${paper} करेंट अफेयर्स — ${hint.hi} नोट्स | SatyaDheesh`
      : `UPSC ${paper} Current Affairs Today — ${hint.en} Notes | SatyaDheesh`
    pageDesc = isHi
      ? `UPSC CSE ${paper} (${hint.hi}) पाठ्यक्रम से जुड़े ताज़ा करेंट अफेयर्स, Prelims तथ्य और Mains प्रश्न।`
      : `Latest UPSC CSE ${paper} (${hint.en}) current affairs notes, high-yield Prelims pointers, and Mains answer dimensions.`
  } else if (exam === 'prelims') {
    queryParam = 'exam=prelims'
    pageTitle = isHi
      ? 'यूपीएससी प्रीलिम्स करेंट अफेयर्स तथ्य एवं पॉइंट्स | SatyaDheesh'
      : 'UPSC Prelims Current Affairs Pointers & High-Yield Facts Today | SatyaDheesh'
    pageDesc = isHi
      ? 'यूपीएससी प्रीलिम्स परीक्षा के लिए महत्वपूर्ण दैनिक तथ्य, अधिनियम, योजनाएं, और पर्यावरण प्वाइंटर्स।'
      : 'High-yield UPSC Prelims current affairs pointers: constitutional articles, bills, schemes, institutions, and environmental facts.'
  } else if (exam === 'mains') {
    queryParam = 'exam=mains'
    pageTitle = isHi
      ? 'यूपीएससी मेन्स प्रश्न एवं उत्तर आयाम विश्लेषण | SatyaDheesh'
      : 'UPSC Mains Questions & Multi-Dimensional Analysis Today | SatyaDheesh'
    pageDesc = isHi
      ? 'दैनिक राष्ट्रीय घटनाक्रम पर आधारित यूपीएससी मेन्स मॉडल प्रश्न और बहुआयामी उत्तर संरचना।'
      : 'Daily UPSC Mains practice questions with structured multi-dimensional answer frameworks and keywords.'
  }

  const langParam = isHi ? 'lang=hi' : ''
  const qs = [queryParam, langParam].filter(Boolean).join('&')
  const canonicalUrl = qs ? `https://satyadheesh.in/upsc?${qs}` : 'https://satyadheesh.in/upsc'

  const enLangUrl = queryParam ? `https://satyadheesh.in/upsc?${queryParam}` : 'https://satyadheesh.in/upsc'
  const hiLangUrl = queryParam ? `https://satyadheesh.in/upsc?${queryParam}&lang=hi` : 'https://satyadheesh.in/upsc?lang=hi'

  return {
    title: pageTitle,
    description: pageDesc,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-IN': enLangUrl,
        'hi-IN': hiLangUrl,
        'x-default': enLangUrl,
      },
    },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: canonicalUrl,
      siteName: 'SatyaDheesh',
      locale: isHi ? 'hi_IN' : 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
    },
  }
}

const PAPER_HINT: Record<string, { en: string; hi: string }> = {
  GS1: { en: 'History · Society · Geography', hi: 'इतिहास · समाज · भूगोल' },
  GS2: { en: 'Polity · Governance · IR', hi: 'राजव्यवस्था · शासन · अंतर्राष्ट्रीय संबंध' },
  GS3: { en: 'Economy · S&T · Environment · Security', hi: 'अर्थव्यवस्था · विज्ञान-तकनीक · पर्यावरण · सुरक्षा' },
  GS4: { en: 'Ethics', hi: 'नीतिशास्त्र' },
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

function dayLabel(ts: number, isHi: boolean) {
  const today = istDayStart()
  const d = istDayStart(ts)
  if (d === today) return isHi ? 'आज' : 'Today'
  if (d === today - 86400) return isHi ? 'कल' : 'Yesterday'
  return new Date(ts * 1000).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

const Chip = UpscNavChip

function Card({ it, isHi }: { it: UpscItem; isHi: boolean }) {
  return (
    <article id={`a${it.articleId}`} className="scroll-mt-24 border rounded-xl px-4 md:px-5 py-4 bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
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
        <span className="font-semibold">{isHi ? 'चर्चा में क्यों: ' : 'Why in news: '}</span>{it.whyInNews}
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
            {isHi ? 'रिवीजन के लिए कालक्रम →' : 'Chronology for revision →'}
          </Link>
        )}
        {it.related > 0 && (
          <span>{isHi ? `+${it.related} और खबरें इस विषय पर` : `+${it.related} more on this story`}</span>
        )}
        {it.secondary.map(s => (
          <span key={s.node}>{isHi ? 'यह भी ' : 'Also '}{UPSC_SYLLABUS[s.subject]?.paper} · {nodeLabel(s.subject, s.node)}</span>
        ))}
      </div>
    </article>
  )
}

export default async function UPSCPage({ searchParams }: { searchParams: SP }) {
  const cookieStore = cookies()
  const lang: Language = getLanguage(cookieStore.get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'

  const sp: SP = {
    paper: (UPSC_PAPERS as readonly string[]).includes(searchParams.paper ?? '') ? searchParams.paper : undefined,
    subject: UPSC_SYLLABUS[searchParams.subject ?? ''] ? searchParams.subject : undefined,
    exam: searchParams.exam === 'prelims' || searchParams.exam === 'mains' ? searchParams.exam : undefined,
    page: String(Math.max(0, Math.min(200, parseInt(searchParams.page ?? '0', 10) || 0))),
    lang: searchParams.lang,
  }
  // a subject implies its paper
  if (sp.subject) sp.paper = UPSC_SYLLABUS[sp.subject].paper
  const filters: UpscFilters = { paper: sp.paper, subject: sp.subject, exam: sp.exam, page: Number(sp.page) }
  const unfiltered = !sp.paper && !sp.exam && filters.page === 0

  const [stats, feed, top] = await Promise.all([
    getUpscStats(),
    getUpscFeed(filters, lang),
    unfiltered ? getUpscTopPicks(lang) : Promise.resolve([] as UpscItem[]),
  ])

  const subjects = sp.paper ? Object.entries(UPSC_SYLLABUS).filter(([, s]) => s.paper === sp.paper) : []

  // group feed by IST day
  const groups: { label: string; items: UpscItem[] }[] = []
  for (const it of feed.items) {
    const label = dayLabel(it.publishedAt, isHi)
    if (groups[groups.length - 1]?.label !== label) groups.push({ label, items: [] })
    groups[groups.length - 1].items.push(it)
  }

  return (
    <div className="md:max-w-3xl md:mx-auto pb-10">
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">
          {isHi ? 'प्रतियोगियों के लिए' : 'For aspirants'}
        </span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1 mb-0">
          {isHi ? 'यूपीएससी करेंट अफेयर्स' : 'UPSC Current Affairs'}
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1 mb-0">
          {isHi ? 'केवल परीक्षा उपयोगी समाचार, जीएस पाठ्यक्रम के अनुसार।' : 'Only the news that matters for the exam, mapped to the GS syllabus.'}
          <span className="font-mono text-[11px] text-[var(--text3)]">
            {' '}· {stats.today} {isHi ? 'आज' : 'today'} · {stats.week} {isHi ? 'इस सप्ताह' : 'this week'}
          </span>
        </p>
      </div>

      <div className="px-4 md:px-6 space-y-4 mt-4">
        {top.length > 0 && (
          <section className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--bg-alt)]" style={{ borderColor: 'var(--border-md)' }}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">
              {isHi ? `यदि आप केवल ${top.length} पढ़ें` : `If you read only ${top.length}`}
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
            <Chip to={href(sp, { paper: undefined, subject: undefined, page: '0' })} active={!sp.paper}>
              {isHi ? 'सभी प्रश्नपत्र' : 'All papers'}
            </Chip>
            {UPSC_PAPERS.map(p => (
              <Chip key={p} to={href(sp, { paper: p, subject: undefined, page: '0' })} active={sp.paper === p}>
                {p}
                {stats.papers[p] ? <span className="opacity-60"> · {stats.papers[p]}</span> : null}
              </Chip>
            ))}
          </div>
          {sp.paper && (
            <p className="text-[11px] text-[var(--text3)] m-0">
              {PAPER_HINT[sp.paper] ? (isHi ? PAPER_HINT[sp.paper].hi : PAPER_HINT[sp.paper].en) : ''} · {isHi ? 'संख्या पिछले 7 दिनों की है' : 'counts are last 7 days'}
            </p>
          )}
          {subjects.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <Chip to={href(sp, { subject: undefined, page: '0' })} active={!sp.subject}>
                {isHi ? `सभी ${sp.paper}` : `All ${sp.paper}`}
              </Chip>
              {subjects.map(([key, s]) => (
                <Chip key={key} to={href(sp, { subject: key, page: '0' })} active={sp.subject === key}>{s.label}</Chip>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <Chip to={href(sp, { exam: undefined, page: '0' })} active={!sp.exam}>
              Prelims + Mains
            </Chip>
            <Chip to={href(sp, { exam: 'prelims', page: '0' })} active={sp.exam === 'prelims'}>
              Prelims facts
            </Chip>
            <Chip to={href(sp, { exam: 'mains', page: '0' })} active={sp.exam === 'mains'}>
              Mains analysis
            </Chip>
          </div>
        </section>

        {feed.items.length === 0 ? (
          <p className="text-center text-[13px] text-[var(--text3)] py-12">
            {filters.page > 0
              ? (isHi ? 'कोई और नोट्स नहीं।' : 'No more notes.')
              : (isHi ? 'इस फ़िल्टर के लिए अभी कोई नोट्स नहीं हैं। दिनभर में नए आइटम जोड़े जाते हैं।' : 'No notes yet for this filter. New items are added through the day.')}
          </p>
        ) : (
          groups.map(g => (
            <section key={g.label} className="space-y-3">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 pt-2">{g.label}</h2>
              {g.items.map(it => (
                <Card key={it.articleId} it={it} isHi={isHi} />
              ))}
            </section>
          ))
        )}

        {(filters.page > 0 || feed.hasNext) && (
          <nav className="flex justify-between text-[13px] pt-2">
            {filters.page > 0 ? (
              <Link href={href(sp, { page: String(filters.page - 1) })} className="text-[var(--accent)]">
                {isHi ? '← नए' : '← Newer'}
              </Link>
            ) : <span />}
            {feed.hasNext && (
              <Link href={href(sp, { page: String(filters.page + 1) })} className="text-[var(--accent)]">
                {isHi ? 'पुराने →' : 'Older →'}
              </Link>
            )}
          </nav>
        )}

        <p className="text-[11px] text-[var(--text3)] leading-relaxed pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {isHi
            ? 'नोट्स सत्यधीश के समाचार फ़ीड से स्वचालित रूप से तैयार किए जाते हैं और यूपीएससी सीएसई पाठ्यक्रम से जुड़े हैं। उत्तर में उपयोग करने से पहले हमेशा मूल रिपोर्ट या पीआईबी से तथ्यों, अनुच्छेदों और आंकड़ों का मिलान करें।'
            : "Notes are generated automatically from SatyaDheesh's news feed and mapped to the UPSC CSE syllabus. Always check facts, Articles and figures against the original report or PIB before using them in an answer."}
        </p>
      </div>
    </div>
  )
}
