import { api } from '@/lib/api'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { ArticleList } from '@/components/ArticleList'
import { JsonLd, makeBreadcrumbJsonLd } from '@/components/JsonLd'
import type { Metadata } from 'next'
import { slugify, sourceNameHi } from '@/lib/utils'
import { getLanguage, LANG_COOKIE, Language } from '@/lib/i18n'
import { notFound, permanentRedirect } from 'next/navigation'

export const revalidate = false

type Props = { params: { name: string }; searchParams?: { lang?: string } }

// A Hindi source page is indexed only with enough translated stories to be useful.
const MIN_HI_ARTICLES = 10

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const lang: Language = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'
  const sourceName = decodeURIComponent(params.name)
  const sourceData = await api.source(sourceName, lang).catch(() => null)
  if (!sourceData) {
    return { title: 'Not Found | SatyaDheesh', robots: { index: false } }
  }

  const name = sourceData.source || sourceName
  const slug = slugify(name)
  const hiName = sourceNameHi(name)
  const url = `https://satyadheesh.in/source/${slug}`
  const hiData = isHi ? sourceData : await api.source(sourceName, 'hi').catch(() => null)
  const hiReady = (hiData?.articles?.length ?? 0) >= MIN_HI_ARTICLES

  // Hindi: aimed at "<outlet> की खबरें हिंदी में" / "<outlet> news in Hindi" searches, with both
  // spellings of the outlet's name. Always framed as our independent summaries.
  const title = isHi
    ? `${hiName} की आज की खबरें हिंदी में (${name} News in Hindi) | SatyaDheesh`
    : `${name} news today — independent summaries | SatyaDheesh`
  const description = isHi
    ? `${hiName} (${name}) की ताज़ा खबरों के स्वतंत्र हिंदी सारांश, हर खबर के साथ मूल रिपोर्ट का लिंक। SatyaDheesh एक स्वतंत्र समाचार संकलक है, ${name} से संबद्ध नहीं।`
    : `Latest stories reported by ${name}, each with an independent summary and a link to the original report. SatyaDheesh is an independent aggregator, not affiliated with ${name}.`

  return {
    title,
    description,
    ...(isHi && !hiReady ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: isHi ? `${url}?lang=hi` : url,
      languages: {
        'en-IN': url,
        ...(hiReady ? { 'hi-IN': `${url}?lang=hi` } : {}),
        'x-default': url,
      },
    },
    openGraph: { title, description, url: isHi ? `${url}?lang=hi` : url, siteName: 'SatyaDheesh' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SourcePage({ params, searchParams }: Props) {
  const lang: Language = getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang)
  const isHi = lang === 'hi'
  const sourceName = decodeURIComponent(params.name)

  const sourceData = await api.source(sourceName, lang)
  if (!sourceData) notFound()

  const name = sourceData.source || sourceName
  const slug = slugify(name)
  if (decodeURIComponent(params.name) !== slug) {
    permanentRedirect(`/source/${slug}${isHi ? '?lang=hi' : ''}`)
  }
  const hiName = sourceNameHi(name)
  const articles = sourceData.articles ?? []

  const breadcrumbData = makeBreadcrumbJsonLd([
    { name: isHi ? 'होम' : 'Home', item: `https://satyadheesh.in/${isHi ? '?lang=hi' : ''}` },
    { name: isHi ? hiName : name, item: `https://satyadheesh.in/source/${slug}${isHi ? '?lang=hi' : ''}` },
  ])

  return (
    <div className="md:max-w-4xl md:mx-auto">
      <JsonLd data={breadcrumbData} />
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <Link
          href={isHi ? '/?lang=hi' : '/'}
          className="text-[10px] font-mono tracking-widest uppercase transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          ← {isHi ? 'फ़ीड' : 'Feed'}
        </Link>
        <div className="mt-2">
          <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">{isHi ? 'स्रोत' : 'Source'}</span>
          <h1 className="text-[22px] md:text-[26px] font-black font-serif mt-1" style={{ color: 'var(--text1)' }}>
            {isHi ? `${hiName} की खबरें — हिंदी में` : name}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
            {isHi
              ? `${articles.length} ताज़ा खबरें, हर एक का हिंदी सारांश`
              : `${articles.length} article${articles.length !== 1 ? 's' : ''} in current feed`}
          </p>
          <p className="text-[11px] mt-2 mb-0 leading-relaxed" style={{ color: 'var(--text3)' }}>
            {isHi
              ? `SatyaDheesh एक स्वतंत्र समाचार संकलक है और ${hiName} (${name}) से संबद्ध नहीं है। यहां हर खबर हमारा अपना सारांश है; पूरी रिपोर्ट के लिए मूल लेख पढ़ें।`
              : `SatyaDheesh is an independent aggregator and is not affiliated with ${name}. Each story here is our own summary; read the original report for the full article.`}
          </p>
        </div>
      </div>

      <ArticleList
        articles={articles}
        emptyMessage={isHi ? `${hiName} की कोई हिंदी खबर अभी उपलब्ध नहीं` : `No articles from ${name} in the current feed`}
      />
    </div>
  )
}
