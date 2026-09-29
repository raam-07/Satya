import { api } from '@/lib/api'
import { TimelinesClient } from '@/components/TimelinesClient'
import { cookies } from 'next/headers'
import { getLanguage, LANG_COOKIE, Language } from '@/lib/i18n'
import type { Metadata } from 'next'

export const revalidate = 259200 // 3 days — timelines change only on stitch/daily-run for now

export const metadata: Metadata = {
  title: 'Timelines — Developing Political Stories Tracked Update by Update | SatyaDheesh',
  description:
    'Every developing Indian political story as a timeline: budget sessions, elections, scams, and policy battles tracked milestone by milestone with sources.',
  alternates: {
    canonical: 'https://satyadheesh.in/timelines',
    languages: {
      'en-IN': 'https://satyadheesh.in/timelines',
      'hi-IN': 'https://satyadheesh.in/timelines?lang=hi',
      'x-default': 'https://satyadheesh.in/timelines',
    },
  },
  openGraph: {
    title: 'Political Event Timelines India — Tracked Update by Update | SatyaDheesh',
    description: 'Every major Indian political event, scam, election, and session documented as an evidence-backed chronological timeline.',
    url: 'https://satyadheesh.in/timelines',
    siteName: 'SatyaDheesh',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Political Event Timelines India — Tracked Update by Update | SatyaDheesh',
    description: 'Every major Indian political event, scam, election, and session documented as an evidence-backed chronological timeline.',
  },
}

export default async function TimelinesPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const cookieStore = cookies()
  const lang: Language = getLanguage(cookieStore.get(LANG_COOKIE)?.value, searchParams?.lang)

  const data = await api.eventsList(lang)
  const events = data?.events ?? []

  const ongoing = events.filter(e => e.state === 'open').length

  return (
    <div className="md:max-w-3xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">
          {lang === 'hi' ? 'सेक्शन' : 'Section'}
        </span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">
          {lang === 'hi' ? 'टाइमलाइन्स' : 'Timelines'}
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1">
          {lang === 'hi' ? 'हर प्रमुख राजनीतिक घटनाक्रम का चरणबद्ध विवरण।' : 'Every developing story, tracked update by update.'}
          {ongoing > 0 && (
            <span className="font-mono text-[11px] text-[var(--text3)]">
              {' · '}
              {lang === 'hi' ? `${ongoing} जारी` : `${ongoing} ongoing`}
            </span>
          )}
        </p>
      </div>

      <TimelinesClient events={events} currentLang={lang} />
    </div>
  )
}
