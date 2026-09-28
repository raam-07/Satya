import { cookies } from 'next/headers'
import { api } from '@/lib/api'
import { HomeClient } from '@/components/HomeClient'
import { getLanguage } from '@/lib/i18n'
import type { Metadata } from 'next'

// Title and description come from the root layout. The canonical lives here,
// not in the layout, because a layout-level canonical would be inherited by
// every page that does not set its own and point them all at the homepage.
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://satyadheesh.in',
    languages: {
      'en-IN': 'https://satyadheesh.in',
      'hi-IN': 'https://satyadheesh.in?lang=hi',
      'x-default': 'https://satyadheesh.in',
    },
  },
}

export const revalidate = false

export default async function HomePage({ searchParams }: { searchParams?: { lang?: string } }) {
  const cookieStore = cookies()
  const lang = getLanguage(cookieStore.get('satya_lang')?.value, searchParams?.lang)

  // Fast first paint: only 60 articles server-side; the client tops up to the
  // full feed in the background after hydration.
  const [overview, feedData] = await Promise.all([
    api.indiaOverview(false, lang),
    api.feed('all', false, 60, 0, lang),
  ])

  const initialArticles = feedData?.articles ?? []

  return (
    <HomeClient
      overview={overview}
      initialArticles={initialArticles}
      currentLang={lang}
    />
  )
}
