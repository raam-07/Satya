import { api } from '@/lib/api'
import { HomeClient } from '@/components/HomeClient'
import type { Metadata } from 'next'

// Title and description come from the root layout. The canonical lives here,
// not in the layout, because a layout-level canonical would be inherited by
// every page that does not set its own and point them all at the homepage.
export const metadata: Metadata = {
  alternates: { canonical: 'https://satyadheesh.in' },
}

export const revalidate = false

export default async function HomePage() {
  // Fast first paint: only 60 articles server-side; the client tops up to the
  // full feed in the background after hydration.
  const [overview, feedData] = await Promise.all([
    api.indiaOverview(),
    api.feed('all', false, 60),
  ])

  const initialArticles = feedData?.articles ?? []

  return (
    <HomeClient
      overview={overview}
      initialArticles={initialArticles}
    />
  )
}
