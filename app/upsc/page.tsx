import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getLanguage, LANG_COOKIE, Language } from '@/lib/i18n'
import { cleanTitle } from '@/lib/utils'
import { UPSC_SYLLABUS } from '@/lib/upscSyllabus'
import {
  PAGE_SIZE, UPSC_PAPERS, getUpscDays, getUpscFeed, getUpscStats, getUpscTopPicks, istDayStart, nodeLabel, subjectLabel,
  type UpscFilters, type UpscItem,
} from '@/lib/upsc'
import { UpscNavChip } from '@/components/UpscNavChip'
import { UpscCard, PAPER_HINT } from '@/components/UpscCard'

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

const Card = UpscCard

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

  const [stats, feed, top, days] = await Promise.all([
    getUpscStats(),
    getUpscFeed(filters, lang),
    unfiltered ? getUpscTopPicks(lang) : Promise.resolve([] as UpscItem[]),
    getUpscDays(1),
  ])
  const latestDay = days[0]?.day

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
        <p className="text-[12.5px] mt-2 mb-0 flex flex-wrap gap-x-4 gap-y-1">
          {latestDay && (
            <Link href={`/upsc/current-affairs/${latestDay}${isHi ? '?lang=hi' : ''}`} className="font-semibold text-[var(--accent)] hover:underline">
              {isHi ? 'आज का पूरा पेज (जीएस अनुसार) →' : "Today's page, by GS paper →"}
            </Link>
          )}
          <Link href={`/upsc/current-affairs${isHi ? '?lang=hi' : ''}`} className="text-[var(--text2)] hover:text-[var(--accent)] hover:underline">
            {isHi ? 'दैनिक संग्रह' : 'Daily archive'}
          </Link>
          <Link href={`/upsc/reports${isHi ? '?lang=hi' : ''}`} className="font-semibold text-[var(--accent)] hover:underline">
            {isHi ? '⬇ पीडीएफ: दैनिक · साप्ताहिक · मासिक' : '⬇ PDFs: daily · weekly · monthly'}
          </Link>
        </p>
        <a
          href="https://t.me/satyadheesh"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-[12.5px] font-semibold text-[var(--text1)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          style={{ borderColor: 'var(--border-md)' }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="#229ED9">
            <path d="M21.9 4.3 18.6 19.9c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2L6 13.4 1.1 11.9c-1.1-.3-1.1-1.1.2-1.6L20.5 2.9c.9-.3 1.7.2 1.4 1.4z" />
          </svg>
          {isHi ? 'टेलीग्राम पर जुड़ें: @satyadheesh' : 'Join us on Telegram: @satyadheesh'}
          <span className="font-normal text-[var(--text3)]">
            {isHi ? '· रोज़ सुबह 5 बजे पीडीएफ + क्विज़' : '· daily PDF + quiz at 5 AM'}
          </span>
        </a>
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
          <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-[13px] pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div>
              {filters.page > 0 ? (
                <Link
                  href={href(sp, { page: String(filters.page - 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border font-medium text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {isHi ? '← नए नोट्स' : '← Newer notes'}
                </Link>
              ) : (
                <span className="text-[12px] font-mono text-[var(--text3)]">
                  {isHi ? 'नवीनतम पृष्ठ' : 'Latest page'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[12px] font-mono text-[var(--text2)]">
              {filters.page > 1 && (
                <Link
                  href={href(sp, { page: '0' })}
                  className="px-2 py-1 rounded border hover:border-[var(--accent)] text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                  title="First Page"
                >
                  1
                </Link>
              )}
              {filters.page > 2 && <span className="text-[var(--text3)]">…</span>}
              <span className="px-2.5 py-1 rounded font-semibold bg-[var(--surface)] border text-[var(--text1)]" style={{ borderColor: 'var(--border-hi)' }}>
                {isHi ? `पृष्ठ ${filters.page + 1}` : `Page ${filters.page + 1}`}
              </span>
              {feed.hasNext && (
                <span className="text-[11px] text-[var(--text3)] pl-1">
                  ({PAGE_SIZE} {isHi ? 'प्रति पृष्ठ' : '/ page'})
                </span>
              )}
            </div>

            <div>
              {feed.hasNext ? (
                <Link
                  href={href(sp, { page: String(filters.page + 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border font-medium text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {isHi ? 'पुराने नोट्स →' : 'Older notes →'}
                </Link>
              ) : (
                <span className="text-[12px] font-mono text-[var(--text3)]">
                  {isHi ? 'संग्रह का अंत' : 'End of feed'}
                </span>
              )}
            </div>
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
