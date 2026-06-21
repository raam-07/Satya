import { MetadataRoute } from 'next'
import { api } from '@/lib/api'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://satyadheesh.in'

  // Define static routes
  const staticRoutes = [
    '',
    '/about',
    '/data',
    '/netas',
    '/vaade',
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))

  const dynamicRoutes: MetadataRoute.Sitemap = []

  try {
    const overview = await api.indiaOverview()
    
    // Add top minister page routes dynamically
    if (overview?.top_ministers_30d) {
      Object.keys(overview.top_ministers_30d).forEach(name => {
        const slug = name.toLowerCase().replace(/\s+/g, '_')
        dynamicRoutes.push({
          url: `${baseUrl}/minister/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      })
    }

    // Add top state page routes dynamically
    if (overview?.top_states_30d) {
      Object.keys(overview.top_states_30d).forEach(state => {
        const slug = state.toLowerCase().replace(/\s+/g, '_')
        dynamicRoutes.push({
          url: `${baseUrl}/state/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      })
    }
  } catch (err) {
    console.error('Failed to generate dynamic sitemap routes:', err)
  }

  return [...staticRoutes, ...dynamicRoutes]
}
