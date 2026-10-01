import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cleanTitle } from '@/lib/utils'
import type { Language } from '@/lib/i18n'
import {
  availablePeriods, buildReport, getReportFiles, parsePeriod, reportPagePath, reportPublishable,
  subjectName, POINTER_LABEL_HI, type ReportKind,
} from '@/lib/upscReports'
import { UpscCard, PAPER_HINT, POINTER_LABEL } from '@/components/UpscCard'
import { UpscPdfButton } from '@/components/UpscPdfButton'
import { JsonLd } from '@/components/JsonLd'

const SITE = 'https://satyadheesh.in'
const MIN_TO_INDEX = 5

/** Metadata for the weekly/monthly report pages. */
export async function reportMetadata(kind: ReportKind, key: string, lang: Language): Promise<Metadata> {
  const isHi = lang === 'hi'
  const period = parsePeriod(kind, key)
  const r = period ? await buildReport(period, lang) : null
  if (!period || !r) return { title: 'Not Found | SatyaDheesh', robots: { index: false } }
  const hi = isHi ? r : await buildReport(period, 'hi')
  const hiReady = reportPublishable(hi)
  const url = `${SITE}${reportPagePath(kind, key, false)}`
  const indexable = r.selected >= MIN_TO_INDEX && (!isHi || hiReady)
  const title = isHi
    ? `${r.title} — पीडीएफ, जीएस1–जीएस4 नोट्स | SatyaDheesh`
    : `${r.title} — PDF, GS1–GS4 notes | SatyaDheesh`
  const top = r.top.slice(0, 3).map(i => cleanTitle(i.title)).join('; ')
  const description = (isHi
    ? `${r.label} के ${r.selected} सबसे महत्वपूर्ण यूपीएससी नोट्स, जीएस पेपर और विषय के अनुसार, मेन्स प्रश्न और प्रीलिम्स दोहराव के साथ। मुफ़्त पीडीएफ। ${top}`
    : `The ${r.selected} most exam-relevant UPSC notes of ${r.label}, by GS paper and subject, with mains questions and prelims revision. Free PDF. ${top}`).slice(0, 300)
  return {
    title, description,
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    alternates: {
      canonical: isHi ? `${url}?lang=hi` : url,
      languages: { 'en-IN': url, ...(hiReady ? { 'hi-IN': `${url}?lang=hi` } : {}), 'x-default': url },
    },
    openGraph: { title, description, url: isHi ? `${url}?lang=hi` : url, siteName: 'SatyaDheesh', type: 'article' },
  }
}

/** Weekly/monthly report page: the digest online, plus the PDF download. */
export async function ReportPage({ kind, periodKey, lang }: { kind: ReportKind; periodKey: string; lang: Language }) {
  const isHi = lang === 'hi'
  const period = parsePeriod(kind, periodKey)
  if (!period) notFound()
  const [r, files, avail] = await Promise.all([buildReport(period, lang), getReportFiles(), availablePeriods()])
  if (!r) notFound()
  const q = isHi ? '?lang=hi' : ''

  const list = avail[kind]
  const idx = list.findIndex(p => p.key === periodKey)
  const newer = idx > 0 ? list[idx - 1] : null
  const older = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null
  const navLink = 'inline-flex items-center px-3 py-1.5 rounded-md border text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: r.title,
    url: `${SITE}${reportPagePath(kind, periodKey, isHi)}`,
    inLanguage: isHi ? 'hi-IN' : 'en-IN',
    datePublished: new Date(period.start * 1000).toISOString(),
    dateModified: new Date(r.updatedAt * 1000).toISOString(),
    isPartOf: { '@type': 'WebSite', name: 'SatyaDheesh', url: SITE },
  }

  return (
    <div className="md:max-w-3xl md:mx-auto pb-10">
      <JsonLd data={jsonLd} />
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <nav className="text-[11px] font-mono text-[var(--text3)] mb-1">
          <Link href={`/upsc${q}`} className="hover:text-[var(--accent)]">UPSC</Link>
          <span className="opacity-60"> › </span>
          <Link href={`/upsc/reports${q}`} className="hover:text-[var(--accent)]">{isHi ? 'रिपोर्ट और पीडीएफ' : 'Reports & PDFs'}</Link>
        </nav>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1 mb-0">{r.title}</h1>
        <p className="text-[13px] text-[var(--text2)] mt-1 mb-0">
          {isHi
            ? `इस अवधि के ${r.totalNotes} नोट्स में से ${r.selected} सबसे उपयोगी, जीएस पेपर और विषय के अनुसार`
            : `The ${r.selected} most exam-relevant of ${r.totalNotes} notes, by GS paper and subject`}
          <span className="font-mono text-[11px] text-[var(--text3)]">{' · '}{r.groups.map(g => `${g.paper} ${g.count}`).join(' · ')}</span>
        </p>
        <UpscPdfButton kind={kind} period={periodKey} isHi={isHi} files={files} />
      </div>

      <div className="px-4 md:px-6 space-y-5 mt-4">
        {r.top.length > 0 && (
          <section className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--bg-alt)]" style={{ borderColor: 'var(--border-md)' }}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">
              {isHi ? 'सबसे महत्वपूर्ण' : 'Most important'}
            </h2>
            <ol className="m-0 pl-5 space-y-2">
              {r.top.map(t => (
                <li key={t.articleId} className="text-[14px] text-[var(--text1)] leading-snug">
                  <a href={`#a${t.articleId}`} className="font-semibold hover:text-[var(--accent)]">{cleanTitle(t.title)}</a>
                  <span className="text-[11px] font-mono text-[var(--text3)]"> · {t.paper}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {r.groups.map(g => (
          <section key={g.paper} className="space-y-3" aria-labelledby={`h-${g.paper}`}>
            <h2 id={`h-${g.paper}`} className="text-[15px] font-bold text-[var(--text1)] m-0 pt-2">
              {g.paper}
              <span className="text-[12px] font-normal text-[var(--text3)]"> · {isHi ? PAPER_HINT[g.paper]?.hi : PAPER_HINT[g.paper]?.en} · {g.count}</span>
            </h2>
            {g.subjects.map(s => (
              <div key={s.subject} className="space-y-3">
                <h3 className="text-[12px] font-mono uppercase tracking-widest text-[var(--accent)] m-0">{subjectName(s.subject, isHi)}</h3>
                {s.items.map(it => <UpscCard key={it.articleId} it={it} isHi={isHi} />)}
              </div>
            ))}
          </section>
        ))}

        {r.mains.length > 0 && (
          <section className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">
              {isHi ? 'अभ्यास — मेन्स प्रश्न' : 'Practice — Mains questions'}
            </h2>
            <ol className="m-0 pl-5 space-y-2">
              {r.mains.map(m => (
                <li key={m.articleId} className="text-[13.5px] text-[var(--text1)] leading-snug">
                  {m.mainsQuestion}
                  <a href={`#a${m.articleId}`} className="text-[11px] font-mono text-[var(--text3)] hover:text-[var(--accent)]"> · {m.paper} ↑</a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {r.revision.length > 0 && (
          <section className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">
              {isHi ? 'प्रीलिम्स त्वरित दोहराव' : 'Prelims quick revision'}
            </h2>
            <ul className="m-0 pl-5 space-y-1.5 list-disc">
              {r.revision.map((p, i) => (
                <li key={i} className="text-[13px] text-[var(--text2)] leading-snug">
                  <span className="font-semibold text-[var(--text1)]">{(isHi ? POINTER_LABEL_HI[p.type] : POINTER_LABEL[p.type]) ?? ''}</span>
                  {(isHi ? POINTER_LABEL_HI[p.type] : POINTER_LABEL[p.type]) ? ': ' : ''}{p.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label={isHi ? 'अवधि' : 'Periods'} className="flex items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {older
            ? <Link href={reportPagePath(kind, older.key, isHi)} className={navLink} style={{ borderColor: 'var(--border)' }}>← {older.key}</Link>
            : <span />}
          {newer
            ? <Link href={reportPagePath(kind, newer.key, isHi)} className={navLink} style={{ borderColor: 'var(--border)' }}>{newer.key} →</Link>
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
