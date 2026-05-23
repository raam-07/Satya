import { api } from '@/lib/api'
import { HomeClient } from '@/components/HomeClient'

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const initialTab = searchParams?.tab ?? 'all'

  const [overview, feedData] = await Promise.all([
    api.indiaOverview(),
    api.feed('all'),
  ])

  const initialArticles = feedData?.articles ?? []

  return (
    <HomeClient
      overview={overview}
      initialArticles={initialArticles}
      initialTab={initialTab}
    />
  )
}
