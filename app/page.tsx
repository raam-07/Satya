import { api } from '@/lib/api'
import { HomeClient } from '@/components/HomeClient'

export const revalidate = false

export default async function HomePage() {
  const [overview, feedData] = await Promise.all([
    api.indiaOverview(),
    api.feed('all'),
  ])

  const initialArticles = feedData?.articles ?? []

  return (
    <HomeClient
      overview={overview}
      initialArticles={initialArticles}
    />
  )
}
