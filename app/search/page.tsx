import { api } from '@/lib/api'
import { ArticleList } from '@/components/ArticleList'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q?.trim() || ''
  const searchData = query ? await api.search(query) : null
  const articles = searchData?.articles ?? []

  return (
    <div className="md:max-w-6xl md:mx-auto min-h-screen">
      <div className="border-b border-[var(--border-md)] px-4 md:px-6 py-5 bg-[var(--surface)]">
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] leading-tight">
          Search Results
        </h1>
        <p className="text-[12px] text-[var(--text2)] font-mono mt-1">
          {query ? `Showing results for "${searchParams.q}" (${articles.length})` : 'Enter a search term above.'}
        </p>
      </div>
      
      <div style={{ background: 'var(--surface)' }}>
        {query ? (
          <ArticleList
            articles={articles}
            emptyMessage={`No articles found matching "${searchParams.q}"`}
          />
        ) : (
          <div className="p-12 text-center text-[13px] text-[var(--text3)] font-mono bg-[var(--bg)]">
            Enter a search term above.
          </div>
        )}
      </div>
    </div>
  )
}
