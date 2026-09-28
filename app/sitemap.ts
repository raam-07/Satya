import { MetadataRoute } from 'next'
import { api } from '@/lib/api'
import { slugify, partySlugify } from '@/lib/slug'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://satyadheesh.in'

  let latestArticleDate = new Date('2026-06-18')
  let latestPromiseDate = new Date('2026-06-19')
  let latestTimelineDate = new Date('2026-06-18')

  const dynamicRoutes: MetadataRoute.Sitemap = []

  try {
    const overview = await api.indiaOverview()
    if (overview?.top_stories?.[0]?.scraped_at) {
      latestArticleDate = new Date(overview.top_stories[0].scraped_at.replace(' ', 'T'))
    }

    // 1. All dynamic promises (/vaade/[id])
    const promisesData = await api.promises()
    const allPromises = [
      ...(promisesData?.by_status?.broken ?? []),
      ...(promisesData?.by_status?.ongoing ?? []),
      ...(promisesData?.by_status?.kept ?? []),
      ...(promisesData?.by_status?.void ?? []),
    ]

    allPromises.forEach(p => {
      if (p.id) {
        const lastModStr = p.status_history?.length
          ? p.status_history[p.status_history.length - 1].changed_at
          : p.made_on || '2026-06-19'
        const lastModified = new Date(lastModStr)
        if (lastModified.getTime() > latestPromiseDate.getTime()) {
          latestPromiseDate = lastModified
        }

        dynamicRoutes.push({
          url: `${baseUrl}/vaade/${p.id}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })
        dynamicRoutes.push({
          url: `${baseUrl}/vaade/${p.id}?lang=hi`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })
      }
    })

    // 2. All politicians (/minister/[slug])
    const politicians = await api.politicians()
    if (politicians) {
      politicians.forEach(m => {
        const slug = slugify(m.name || '')
        const lastModStr = m.criminal_last_updated || '2026-06-18'
        dynamicRoutes.push({
          url: `${baseUrl}/minister/${slug}`,
          lastModified: new Date(lastModStr),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
        dynamicRoutes.push({
          url: `${baseUrl}/minister/${slug}?lang=hi`,
          lastModified: new Date(lastModStr),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      })
    }

    // 3. All parties (/party/[slug]) and states (/state/[slug]) from manifest
    const manifest = await api.manifest()
    const endpoints = manifest?.endpoints as any
    if (endpoints?.parties) {
      Object.keys(endpoints.parties).forEach(slug => {
        const canonical = partySlugify(slug)
        dynamicRoutes.push({
          url: `${baseUrl}/party/${canonical}`,
          lastModified: latestArticleDate,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      })
    }
    if (endpoints?.states) {
      Object.keys(endpoints.states).forEach(slug => {
        dynamicRoutes.push({
          url: `${baseUrl}/state/${slug}`,
          lastModified: latestArticleDate,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      })
    }

    // 4. All topics (/topic/[slug])
    const topics = [
      'corruption_scam',
      'crime_violence',
      'rape_sexual_crime',
      'farmer_agriculture',
      'foreign_policy',
      'economy',
      'infrastructure',
      'health',
      'education',
      'protest_opposition',
    ]
    topics.forEach(slug => {
      dynamicRoutes.push({
        url: `${baseUrl}/topic/${slug}`,
        lastModified: latestArticleDate,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })
    })

    // 5. All timelines (/event/[slug]) in both English and Hindi
    const { serverApi } = await import('@/lib/api.server')
    const events = (await serverApi.eventSitemapEntries()) ?? []
    events.forEach(ev => {
      const lastMod = ev.last_seen ? new Date(ev.last_seen * 1000) : new Date('2026-06-18')
      if (lastMod.getTime() > latestTimelineDate.getTime()) {
        latestTimelineDate = lastMod
      }
      const freq = (ev.state === 'open' ? 'daily' : 'monthly') as 'daily' | 'monthly'
      const prio = ev.state === 'open' ? 0.8 : 0.6
      dynamicRoutes.push({
        url: `${baseUrl}/event/${ev.slug}`,
        lastModified: lastMod,
        changeFrequency: freq,
        priority: prio,
      })
      dynamicRoutes.push({
        url: `${baseUrl}/event/${ev.slug}?lang=hi`,
        lastModified: lastMod,
        changeFrequency: freq,
        priority: prio,
      })
    })

  } catch (err) {
    console.error('Failed to generate dynamic sitemap routes:', err)
  }

  const staticRoutes = [
    { url: `${baseUrl}`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}?lang=hi`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date('2026-06-18'), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/about?lang=hi`, lastModified: new Date('2026-06-18'), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/data`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/data?lang=hi`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/netas`, lastModified: new Date('2026-06-18'), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/netas?lang=hi`, lastModified: new Date('2026-06-18'), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/vaade`, lastModified: latestPromiseDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/vaade?lang=hi`, lastModified: latestPromiseDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/promises`, lastModified: latestPromiseDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/promises?lang=hi`, lastModified: latestPromiseDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/timelines`, lastModified: latestTimelineDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/timelines?lang=hi`, lastModified: latestTimelineDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/upsc`, lastModified: latestArticleDate, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${baseUrl}/upsc?lang=hi`, lastModified: latestArticleDate, changeFrequency: 'hourly' as const, priority: 0.9 },
    // High-yield UPSC syllabus filter targets
    { url: `${baseUrl}/upsc?paper=GS1`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/upsc?paper=GS2`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/upsc?paper=GS3`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/upsc?paper=GS4`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/upsc?exam=prelims`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/upsc?exam=mains`, lastModified: latestArticleDate, changeFrequency: 'daily' as const, priority: 0.8 },
  ]

  return [...staticRoutes, ...dynamicRoutes]
}
