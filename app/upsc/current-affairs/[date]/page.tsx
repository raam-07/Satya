import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getLanguage, LANG_COOKIE, Language } from '@/lib/i18n'
import { cleanTitle } from '@/lib/utils'
import { UPSC_PAPERS, getUpscDay, getUpscDays, parseIstDay, type UpscItem } from '@/lib/upsc'
import { UpscCard, PAPER_HINT } from '@/components/UpscCard'
import { JsonLd } from '@/components/JsonLd'

export const revalidate = false

type Props = { params: { date: string }; searchParams?: { lang?: string } }

const BASE = 'https://satyadheesh.in/upsc/current-affairs'
const MIN_ITEMS_TO_INDEX = 3

function longDate(dayStart: number, isHi: boolean) {
  return new Date(dayStart * 1000 + 12 * 3600 * 1000).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

/** Hindi day page counts as translated when >= 80% of its notes are. */
const hiShare = (items: UpscItem[]) => items.length ? items.filter(i => i.hi).length / items.length : 0

async function load(date: string, lang: Language) {
  const start = parseIstDay(date)
  if (start === null) return null
  const items = await getUpscDay(start, lang)
  return items.length ? { start, items } : null
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const lang: Language = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'
  const data = await load(params.date, lang)
  if (!data) return { title: 'Not Found | SatyaDheesh', robots: { index: false } }

  const d = longDate(data.start, isHi)
  const url = `${BASE}/${params.date}`
  const hiItems = isHi ? data.items : await getUpscDay(data.start, 'hi')
  const hiReady = hiShare(hiItems) >= 0.8
  const indexable = data.items.length >= MIN_ITEMS_TO_INDEX && (!isHi || hiReady)
  const top = data.items.slice(0, 3).map(i => cleanTitle(i.title)).join('; ')
  const title = isHi
    ? `यूपीएससी करेंट अफेयर्स ${d} — जीएस1 से जीएस4 नोट्स | SatyaDheesh`
    : `UPSC Current Affairs ${d} — GS1 to GS4 notes | SatyaDheesh`
  const description = isHi
    ? `${d} के ${data.items.length} परीक्षा उपयोगी नोट्स: चर्चा में क्यों, प्रीलिम्स तथ्य और मेन्स प्रश्न। ${top}`
    : `${data.items.length} exam-relevant notes for ${d}, mapped to the GS syllabus: why in news, prelims facts and mains questions. ${top}`

  return {
    title,
    description: description.slice(0, 300),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    alternates: {
      canonical: isHi ? `${url}?lang=hi` : url,
      languages: {
        'en-IN': url,
        ...(hiReady ? { 'hi-IN': `${url}?lang=hi` } : {}),
        'x-default': url,
      },
    },
    openGraph: {
      title, description: description.slice(0, 300), url: isHi ? `${url}?lang=hi` : url,
      siteName: 'SatyaDheesh', type: 'article',
      publishedTime: new Date(data.start * 1000).toISOString(),
      modifiedTime: new Date(Math.max(...data.items.map(i => i.publishedAt)) * 1000).toISOString(),
    },
  }
}

export default async function UpscDayPage({ params, searchParams }: Props) {
  const lang: Language = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'
  const [data, days] = await Promise.all([load(params.date, lang), getUpscDays()])
  if (!data) notFound()
  const { start, items } = data
  const q = isHi ? '?lang=hi' : ''
  const d = longDate(start, isHi)

  const idx = days.findIndex(x => x.day === params.date)
  const newer = idx > 0 ? days[idx - 1] : null
  const older = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null

  const byPaper = UPSC_PAPERS.map(p => ({ paper: p, items: items.filter(i => i.paper === p) })).filter(g => g.items.length)
  const top = items.filter(i => i.score >= 4).slice(0, 5)
  const mains = items.filter(i => i.mainsQuestion).slice(0, 8)
  const pageUrl = `${BASE}/${params.date}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isHi ? `यूपीएससी करेंट अफेयर्स ${d}` : `UPSC Current Affairs ${d}`,
    url: pageUrl,
    inLanguage: isHi ? 'hi-IN' : 'en-IN',
    datePublished: new Date(start * 1000).toISOString(),
    dateModified: new Date(Math.max(...items.map(i => i.publishedAt)) * 1000).toISOString(),
    isPartOf: { '@type': 'WebSite', name: 'SatyaDheesh', url: 'https://satyadheesh.in' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 50).map((it, i) => ({
        '@type': 'ListItem', position: i + 1, name: cleanTitle(it.title), url: `${pageUrl}#a${it.articleId}`,
      })),
    },
  }

  const navLink = 'inline-flex items-center px-3 py-1.5 rounded-md border text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors'

  return (
    <div className="md:max-w-3xl md:mx-auto pb-10">
      <JsonLd data={jsonLd} />
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <nav className="text-[11px] font-mono text-[var(--text3)] mb-1">
          <Link href={`/upsc${q}`} className="hover:text-[var(--accent)]">UPSC</Link>
          <span className="opacity-60"> › </span>
          <Link href={`/upsc/current-affairs${q}`} className="hover:text-[var(--accent)]">{isHi ? 'दैनिक संग्रह' : 'Daily archive'}</Link>
        </nav>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1 mb-0">
          {isHi ? `यूपीएससी करेंट अफेयर्स — ${d}` : `UPSC Current Affairs — ${d}`}
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1 mb-0">
          {isHi ? `${items.length} परीक्षा उपयोगी नोट्स, जीएस पाठ्यक्रम के अनुसार` : `${items.length} exam-relevant notes, mapped to the GS syllabus`}
          <span className="font-mono text-[11px] text-[var(--text3)]">
            {' · '}{byPaper.map(g => `${g.paper} ${g.items.length}`).join(' · ')}
          </span>
        </p>
      </div>

      <div className="px-4 md:px-6 space-y-5 mt-4">
        {top.length > 0 && (
          <section className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--bg-alt)]" style={{ borderColor: 'var(--border-md)' }}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">
              {isHi ? 'सबसे पहले ये पढ़ें' : 'Read these first'}
            </h2>
            <ol className="m-0 pl-5 space-y-2">
              {top.map(t => (
                <li key={t.articleId} className="text-[14px] text-[var(--text1)] leading-snug">
                  <a href={`#a${t.articleId}`} className="font-semibold hover:text-[var(--accent)]">{cleanTitle(t.title)}</a>
                  <span className="text-[11px] font-mono text-[var(--text3)]"> · {t.paper}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {byPaper.map(g => (
          <section key={g.paper} className="space-y-3" aria-labelledby={`h-${g.paper}`}>
            <h2 id={`h-${g.paper}`} className="text-[15px] font-bold text-[var(--text1)] m-0 pt-2">
              {g.paper}
              <span className="text-[12px] font-normal text-[var(--text3)]"> · {isHi ? PAPER_HINT[g.paper]?.hi : PAPER_HINT[g.paper]?.en} · {g.items.length}</span>
            </h2>
            {g.items.map(it => <UpscCard key={it.articleId} it={it} isHi={isHi} />)}
          </section>
        ))}

        {mains.length > 0 && (
          <section className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">
              {isHi ? 'आज के मेन्स प्रश्न' : 'Mains questions of the day'}
            </h2>
            <ol className="m-0 pl-5 space-y-2">
              {mains.map(m => (
                <li key={m.articleId} className="text-[13.5px] text-[var(--text1)] leading-snug">
                  {m.mainsQuestion}
                  <a href={`#a${m.articleId}`} className="text-[11px] font-mono text-[var(--text3)] hover:text-[var(--accent)]"> · {m.paper} ↑</a>
                </li>
              ))}
            </ol>
          </section>
        )}

        <nav aria-label={isHi ? 'दिन' : 'Days'} className="flex items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {older
            ? <Link href={`/upsc/current-affairs/${older.day}${q}`} className={navLink} style={{ borderColor: 'var(--border)' }}>← {longDate(older.start, isHi)}</Link>
            : <span />}
          {newer
            ? <Link href={`/upsc/current-affairs/${newer.day}${q}`} className={navLink} style={{ borderColor: 'var(--border)' }}>{longDate(newer.start, isHi)} →</Link>
            : <span />}
        </nav>

        <p className="text-[11px] text-[var(--text3)] leading-relaxed pt-2">
          {isHi
            ? 'नोट्स सत्यधीश के समाचार फ़ीड से स्वचालित रूप से तैयार किए जाते हैं और यूपीएससी सीएसई पाठ्यक्रम से जुड़े हैं। उत्तर में उपयोग करने से पहले तथ्यों का मूल रिपोर्ट या पीआईबी से मिलान करें।'
            : "Notes are generated automatically from SatyaDheesh's news feed and mapped to the UPSC CSE syllabus. Check facts against the original report or PIB before using them in an answer."}
        </p>
      </div>
    </div>
  )
}

