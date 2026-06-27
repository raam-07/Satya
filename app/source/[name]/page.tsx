import { api } from '@/lib/api'
import Link from 'next/link'
import { ArticleList } from '@/components/ArticleList'
import { JsonLd, makeBreadcrumbJsonLd } from '@/components/JsonLd'
import type { Metadata } from 'next'
import { slugify } from '@/lib/utils'
import { notFound, permanentRedirect } from 'next/navigation'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const sourceName = decodeURIComponent(params.name)
  const sourceData = await api.source(sourceName).catch(() => null)
  if (!sourceData) {
    return {
      title: 'Not Found | SatyaDheesh',
      robots: {
        index: false,
      }
    }
  }

  const canonicalName = sourceData.source || sourceName
  const canonicalSlug = slugify(canonicalName)

  const title = `${canonicalName} — articles & verified coverage | SatyaDheesh`
  const description = `Explore verified articles, fact checks, and source coverage published by ${canonicalName} on SatyaDheesh.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://satyadheesh.in/source/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://satyadheesh.in/source/${canonicalSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
  }
}

export default async function SourcePage({ params }: { params: { name: string } }) {
  const sourceName = decodeURIComponent(params.name)

  // Fetch articles directly from the database using the source resolver
  const sourceData = await api.source(sourceName)
  if (!sourceData) {
    notFound()
  }

  const canonicalName = sourceData.source || sourceName
  const canonicalSlug = slugify(canonicalName)
  if (decodeURIComponent(params.name) !== canonicalSlug) {
    permanentRedirect(`/source/${canonicalSlug}`)
  }

  const articles = sourceData.articles ?? []

  const breadcrumbData = makeBreadcrumbJsonLd([
    { name: 'Home', item: 'https://satyadheesh.in/' },
    { name: canonicalName, item: `https://satyadheesh.in/source/${canonicalSlug}` }
  ])

  return (
    <div className="md:max-w-4xl md:mx-auto">
      <JsonLd data={breadcrumbData} />
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <Link
          href="/"
          className="text-[10px] font-mono tracking-widest uppercase transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          ← Feed
        </Link>
        <div className="mt-2">
          <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Source</span>
          <h1 className="text-[22px] md:text-[26px] font-black font-serif mt-1" style={{ color: 'var(--text1)' }}>
            {canonicalName}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
            {articles.length} article{articles.length !== 1 ? 's' : ''} in current feed
          </p>
        </div>
      </div>

      <ArticleList
        articles={articles}
        emptyMessage={`No articles from ${canonicalName} in the current feed`}
      />
    </div>
  )
}
