import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Internal tools only. /api stays crawlable on purpose: the homepage
      // loads more stories from /api/data, and blocking it would stop Google
      // from rendering the page the way visitors see it.
      disallow: ['/admin'],
    },
    sitemap: 'https://satyadheesh.in/sitemap.xml',
  }
}
