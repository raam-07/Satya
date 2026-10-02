import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getLanguage, LANG_COOKIE, Language } from '@/lib/i18n'
import {
  availablePeriods, getReportFiles, periodLabel, reportFileKey, reportPagePath, reportPdfPath,
  type Period, type ReportFile, type ReportKind,
} from '@/lib/upscReports'
import { UpscPdfButton } from '@/components/UpscPdfButton'
import { JsonLd, makeBreadcrumbJsonLd } from '@/components/JsonLd'

export const revalidate = false

type Props = { searchParams?: { lang?: string } }
const URL_ = 'https://satyadheesh.in/upsc/reports'

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const isHi = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang) === 'hi'
  const title = isHi
    ? 'यूपीएससी करेंट अफेयर्स पीडीएफ — दैनिक, साप्ताहिक, मासिक (हिंदी व अंग्रेज़ी) | SatyaDheesh'
    : 'UPSC Current Affairs PDF — Daily, Weekly & Monthly (English & Hindi) | SatyaDheesh'
  const description = isHi
    ? 'मुफ़्त यूपीएससी करेंट अफेयर्स पीडीएफ: रोज़ का संकलन, साप्ताहिक और मासिक परीक्षा सार, जीएस1–जीएस4, मेन्स प्रश्न और प्रीलिम्स दोहराव के साथ। कोई साइन-अप नहीं।'
    : 'Free UPSC current affairs PDFs: daily compilation, weekly and monthly exam digests by GS1–GS4, with mains questions and prelims revision. No sign-up.'
  return {
    title, description,
    alternates: {
      canonical: isHi ? `${URL_}?lang=hi` : URL_,
      languages: { 'en-IN': URL_, 'hi-IN': `${URL_}?lang=hi`, 'x-default': URL_ },
    },
    openGraph: { title, description, url: isHi ? `${URL_}?lang=hi` : URL_, siteName: 'SatyaDheesh' },
  }
}

const KIND_LABEL: Record<ReportKind, { en: string; hi: string; enSub: string; hiSub: string }> = {
  daily: { en: 'Daily', hi: 'दैनिक', enSub: 'Every note of the day, by GS paper', hiSub: 'दिन के सभी नोट्स, जीएस पेपर के अनुसार' },
  weekly: { en: 'Weekly', hi: 'साप्ताहिक', enSub: 'The week’s top notes + practice questions', hiSub: 'सप्ताह के मुख्य नोट्स + अभ्यास प्रश्न' },
  monthly: { en: 'Monthly', hi: 'मासिक', enSub: 'The month’s exam digest, for revision', hiSub: 'महीने का परीक्षा सार, दोहराव के लिए' },
}

function ArchiveList({ periods, kind, isHi, files }: { periods: Period[]; kind: ReportKind; isHi: boolean; files: Record<string, ReportFile> }) {
  if (!periods.length) return null
  return (
    <ul className="m-0 p-0 list-none divide-y border rounded-lg bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
      {periods.map(p => {
        const has = files[reportFileKey(kind, p.key, isHi ? 'hi' : 'en')]
        return (
          <li key={p.key} className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderColor: 'var(--border)' }}>
            <Link href={reportPagePath(kind, p.key, isHi)} className="text-[13.5px] font-medium text-[var(--text1)] hover:text-[var(--accent)]">
              {periodLabel(p, isHi)}
            </Link>
            {has
              ? <a href={reportPdfPath(kind, p.key, isHi)} download className="text-[12px] font-mono text-[var(--accent)] hover:underline shrink-0">PDF ⬇</a>
              : <span className="text-[11px] font-mono text-[var(--text3)] shrink-0">{isHi ? 'जल्द' : 'soon'}</span>}
          </li>
        )
      })}
    </ul>
  )
}

export default async function UpscReportsPage({ searchParams }: Props) {
  const lang: Language = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'
  const q = isHi ? '?lang=hi' : ''
  const [avail, files] = await Promise.all([availablePeriods(), getReportFiles()])
  const latest: { kind: ReportKind; p: Period | undefined }[] = [
    { kind: 'daily', p: avail.daily[0] },
    { kind: 'weekly', p: avail.weekly[0] },
    { kind: 'monthly', p: avail.monthly[0] },
  ]

  const breadcrumbs = makeBreadcrumbJsonLd([
    { name: isHi ? 'यूपीएससी' : 'UPSC', item: `https://satyadheesh.in/upsc${q}` },
    { name: isHi ? 'रिपोर्ट और पीडीएफ' : 'Reports & PDFs', item: `${URL_}${q}` },
  ])

  return (
    <div className="md:max-w-3xl md:mx-auto pb-10">
      <JsonLd data={breadcrumbs} />
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <nav className="text-[11px] font-mono text-[var(--text3)] mb-1">
          <Link href={`/upsc${q}`} className="hover:text-[var(--accent)]">UPSC</Link>
        </nav>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1 mb-0">
          {isHi ? 'यूपीएससी करेंट अफेयर्स — रिपोर्ट और पीडीएफ' : 'UPSC Current Affairs — Reports & PDFs'}
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1 mb-0">
          {isHi
            ? 'दैनिक, साप्ताहिक और मासिक संकलन, हिंदी और अंग्रेज़ी में। मुफ़्त, कोई साइन-अप नहीं — डाउनलोड करें और अपने ग्रुप में शेयर करें।'
            : 'Daily, weekly and monthly compilations in English and Hindi. Free, no sign-up — download and share with your study group.'}
        </p>
      </div>

      <div className="px-4 md:px-6 space-y-6 mt-4">
        <div className="grid gap-3">
          {latest.map(({ kind, p }) => p && (
            <section key={kind} className="border rounded-xl px-4 md:px-5 py-4 bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
                {isHi ? KIND_LABEL[kind].hi : KIND_LABEL[kind].en} · {isHi ? KIND_LABEL[kind].hiSub : KIND_LABEL[kind].enSub}
              </div>
              <h2 className="text-[17px] font-bold text-[var(--text1)] m-0 mt-1">
                <Link href={reportPagePath(kind, p.key, isHi)} className="hover:text-[var(--accent)]">{periodLabel(p, isHi)}</Link>
              </h2>
              <UpscPdfButton kind={kind} period={p.key} isHi={isHi} files={files} />
            </section>
          ))}
        </div>

        <section>
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">{isHi ? 'मासिक संकलन' : 'Monthly compilations'}</h2>
          <ArchiveList periods={avail.monthly} kind="monthly" isHi={isHi} files={files} />
        </section>
        <section>
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">{isHi ? 'साप्ताहिक संकलन' : 'Weekly compilations'}</h2>
          <ArchiveList periods={avail.weekly} kind="weekly" isHi={isHi} files={files} />
        </section>
        <section>
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">{isHi ? 'दैनिक' : 'Daily'}</h2>
          <ArchiveList periods={avail.daily.slice(0, 14)} kind="daily" isHi={isHi} files={files} />
          <p className="text-[12.5px] mt-2 mb-0">
            <Link href={`/upsc/current-affairs${q}`} className="text-[var(--accent)] hover:underline">{isHi ? 'पूरा दैनिक संग्रह →' : 'Full daily archive →'}</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
