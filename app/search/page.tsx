import { api } from '@/lib/api'
import { ArticleList } from '@/components/ArticleList'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q?.toLowerCase() || ''
  const feed = await api.feed('all')
  
  const articles = feed?.articles ?? []
  
  const filtered = query 
    ? articles.filter(a => {
        return (a.title && typeof a.title === 'string' && a.title.toLowerCase().includes(query)) ||
               (a.category && typeof a.category === 'string' && a.category.toLowerCase().includes(query)) ||
               (a.party_mentioned && Array.isArray(a.party_mentioned) && a.party_mentioned.some(p => p && typeof p === 'string' && p.toLowerCase().includes(query))) ||
               (a.ministers_mentioned && Array.isArray(a.ministers_mentioned) && a.ministers_mentioned.some(m => m && typeof m === 'string' && m.toLowerCase().includes(query))) ||
               (a.topic_tags && Array.isArray(a.topic_tags) && a.topic_tags.some(t => t && typeof t === 'string' && t.toLowerCase().includes(query)))
      })
    : []

  return (
    <div className="md:max-w-6xl md:mx-auto min-h-screen">
      <div className="border-b border-[var(--border-md)] px-4 md:px-6 py-5 bg-[var(--surface)]">
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] leading-tight">
          Search Results
        </h1>
        <p className="text-[12px] text-[var(--text2)] font-mono mt-1">
          {query ? `Showing results for "${searchParams.q}" (${filtered.length})` : 'Enter a search term above.'}
        </p>
      </div>
      
      <div style={{ background: 'var(--surface)' }}>
        {query ? (
          <ArticleList
            articles={filtered}
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
