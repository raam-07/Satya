import { api } from '@/lib/api'
import { HomeClient } from '@/components/HomeClient'

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
