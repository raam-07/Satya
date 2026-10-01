import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getLanguage, LANG_COOKIE, Language } from '@/lib/i18n'
import { getUpscDays } from '@/lib/upsc'

export const revalidate = false

type Props = { searchParams?: { lang?: string } }
const URL_ = 'https://satyadheesh.in/upsc/current-affairs'

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const isHi = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang) === 'hi'
  const title = isHi
    ? 'यूपीएससी करेंट अफेयर्स — दैनिक संग्रह (जीएस1–जीएस4) | SatyaDheesh'
    : 'UPSC Current Affairs — Daily Archive (GS1–GS4) | SatyaDheesh'
  const description = isHi
    ? 'हर दिन के यूपीएससी करेंट अफेयर्स नोट्स, जीएस पेपर के अनुसार: चर्चा में क्यों, प्रीलिम्स तथ्य और मेन्स प्रश्न।'
    : 'Every day of UPSC current affairs notes, organised by GS paper: why in news, prelims facts and mains questions.'
  return {
    title, description,
    alternates: {
      canonical: isHi ? `${URL_}?lang=hi` : URL_,
      languages: { 'en-IN': URL_, 'hi-IN': `${URL_}?lang=hi`, 'x-default': URL_ },
    },
    openGraph: { title, description, url: isHi ? `${URL_}?lang=hi` : URL_, siteName: 'SatyaDheesh' },
  }
}

export default async function UpscArchivePage({ searchParams }: Props) {
  const lang: Language = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'
  const q = isHi ? '?lang=hi' : ''
  const days = await getUpscDays()

  const months: { label: string; days: typeof days }[] = []
  for (const d of days) {
    const label = new Date(d.start * 1000 + 12 * 3600 * 1000).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
      month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
    })
    if (months[months.length - 1]?.label !== label) months.push({ label, days: [] })
    months[months.length - 1].days.push(d)
  }

  return (
    <div className="md:max-w-3xl md:mx-auto pb-10">
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <nav className="text-[11px] font-mono text-[var(--text3)] mb-1">
          <Link href={`/upsc${q}`} className="hover:text-[var(--accent)]">UPSC</Link>
        </nav>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1 mb-0">
          {isHi ? 'यूपीएससी करेंट अफेयर्स — दैनिक संग्रह' : 'UPSC Current Affairs — Daily Archive'}
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1 mb-0">
          {isHi ? 'हर दिन का एक पेज, जीएस पेपर के अनुसार।' : 'One page per day, organised by GS paper.'}
        </p>
        <p className="text-[12.5px] mt-2 mb-0">
          <Link href={`/upsc/reports${q}`} className="font-semibold text-[var(--accent)] hover:underline">
            {isHi ? '⬇ दैनिक, साप्ताहिक और मासिक पीडीएफ →' : '⬇ Daily, weekly & monthly PDFs →'}
          </Link>
        </p>
      </div>
      <div className="px-4 md:px-6 space-y-5 mt-4">
        {months.length === 0 && (
          <p className="text-[13px] text-[var(--text2)]">{isHi ? 'अभी कोई नोट्स नहीं।' : 'No notes yet.'}</p>
        )}
        {months.map(m => (
          <section key={m.label}>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text3)] m-0 mb-2">{m.label}</h2>
            <ul className="m-0 p-0 list-none grid grid-cols-2 sm:grid-cols-3 gap-2">
              {m.days.map(d => (
                <li key={d.day}>
                  <Link
                    href={`/upsc/current-affairs/${d.day}${q}`}
                    className="block border rounded-lg px-3 py-2 bg-[var(--surface)] hover:border-[var(--accent)] transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="block text-[14px] font-semibold text-[var(--text1)]">
                      {new Date(d.start * 1000 + 12 * 3600 * 1000).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                    <span className="block text-[11px] font-mono text-[var(--text3)]">{d.n} {isHi ? 'नोट्स' : 'notes'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
