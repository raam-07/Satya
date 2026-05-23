import { api } from '@/lib/api'
import { ArticleCard } from '@/components/ArticleCard'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q?.toLowerCase() || ''
  const feed = await api.feed('all')
  
  const articles = feed?.articles ?? []
  
  const filtered = query 
    ? articles.filter(a => {
        return a.title.toLowerCase().includes(query) ||
               a.category?.toLowerCase().includes(query) ||
               a.party_mentioned?.some(p => p.toLowerCase().includes(query)) ||
               a.ministers_mentioned?.some(m => m.toLowerCase().includes(query)) ||
               a.topic_tags?.some(t => t.toLowerCase().includes(query))
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
      
      <div className="flex flex-col bg-white">
        {filtered.map((article, i) => (
          <ArticleCard key={article.id ?? i} article={article} variant="default" />
        ))}
        {query && filtered.length === 0 && (
          <div className="p-12 text-center text-[13px] text-[var(--text3)] font-mono bg-[var(--bg)]">
            No articles found matching "{searchParams.q}"
          </div>
        )}
      </div>
    </div>
  )
}
