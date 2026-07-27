import React from 'react'

export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function makeBreadcrumbJsonLd(items: { name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": it.name,
      "item": it.item
    }))
  }
}

/**
 * Perform a cached HEAD check on a URL (Wikipedia/Wikidata) to confirm it is valid and resolves.
 * Next.js fetches are cached automatically.
 */
export async function checkUrlResolves(url: string | undefined): Promise<boolean> {
  if (!url || typeof url !== 'string') return false
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'SatyaDheeshBot/1.0 (contact: thesatyadheesh@gmail.com)'
      },
      next: { revalidate: 86400 } // Cache result for 24 hours
    })
    return res.status === 200 || res.status === 301 || res.status === 302
  } catch {
    return false
  }
}
