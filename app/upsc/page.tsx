import { upscDb } from '@/lib/db.upsc'
import { db } from '@/lib/db'
import { CheckSquare, Circle, AlertCircle, Scale, Gavel, Users, BookOpen } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 60 // 60s cache

export default async function UPSCPage({ searchParams }: { searchParams: { paper?: string } }) {
  const selectedPaper = searchParams.paper || 'All'

  // Get Today and This Week stats
  const now = Math.floor(Date.now() / 1000)
  const todayStart = now - (24 * 3600)
  const weekStart = now - (7 * 24 * 3600)

  const statsRes = await upscDb.execute({
    sql: `
      SELECT 
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today_count,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as week_count
      FROM upsc_articles
    `,
    args: [todayStart, weekStart]
  })
  const todayCount = statsRes.rows[0]?.today_count || 0
  const weekCount = statsRes.rows[0]?.week_count || 0

  // Fetch articles based on filter
  let query = "SELECT * FROM upsc_articles"
  let args: any[] = []
  if (selectedPaper !== 'All') {
    query += " WHERE gs_paper = ?"
    args.push(selectedPaper)
  }
  query += " ORDER BY created_at DESC LIMIT 50"

  const articlesRes = await upscDb.execute({ sql: query, args })
  const upscArticles = articlesRes.rows

  // Join with MAIN DB to get Titles and URLs
  const articleIds = upscArticles.map(a => a.article_id)
  let mainArticles: Record<string, any> = {}
  
  if (articleIds.length > 0) {
    const placeholders = articleIds.map(() => '?').join(',')
    const mainRes = await db.execute({
      sql: `SELECT id, title, url FROM articles WHERE id IN (${placeholders})`,
      args: articleIds
    })
    mainRes.rows.forEach(r => {
      mainArticles[String(r.id)] = r
    })
  }

  const papers = ['All', 'GS1', 'GS2', 'GS3', 'GS4', 'Prelims facts']

  const getIcon = (paper: string) => {
    switch (paper) {
      case 'GS1': return <Users className="w-4 h-4 mr-1 inline" />
      case 'GS2': return <Gavel className="w-4 h-4 mr-1 inline" />
      case 'GS3': return <Scale className="w-4 h-4 mr-1 inline" />
      case 'GS4': return <AlertCircle className="w-4 h-4 mr-1 inline" />
      default: return <BookOpen className="w-4 h-4 mr-1 inline" />
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 text-white pb-24">
      
      {/* Header */}
      <div className="border border-neutral-800 rounded-2xl p-5 bg-neutral-900 shadow-sm">
        <p className="text-xs text-neutral-400 mb-1 uppercase tracking-wider font-bold">Header</p>
        <h1 className="text-xl font-bold mb-1">UPSC Current Affairs</h1>
        <p className="text-xs text-neutral-400">GS-paper tagged · sourced from live feed</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center shadow-sm">
          <p className="text-xs text-neutral-400 mb-2 uppercase tracking-wide font-bold">Today</p>
          <p className="text-3xl font-medium">{String(todayCount)}</p>
          <p className="text-xs text-neutral-500 mt-2">tagged articles</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center shadow-sm">
          <p className="text-xs text-neutral-400 mb-2 uppercase tracking-wide font-bold">This week</p>
          <p className="text-3xl font-medium">{String(weekCount)}</p>
          <p className="text-xs text-neutral-500 mt-2">tagged articles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-neutral-800 rounded-2xl p-5 bg-neutral-900 shadow-sm">
        <p className="text-xs text-neutral-400 mb-3 uppercase tracking-wide font-bold">Filter by GS paper</p>
        <div className="flex flex-wrap gap-2">
          {papers.map(p => (
            <Link key={p} href={`/upsc${p === 'All' ? '' : `?paper=${p}`}`}>
              <span className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                selectedPaper === p 
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 font-bold' 
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
              }`}>
                {p}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-4">
        {upscArticles.length === 0 ? (
          <p className="text-center text-neutral-500 py-10">No UPSC articles found for this filter.</p>
        ) : (
          upscArticles.map((ua) => {
            const article = mainArticles[String(ua.article_id)]
            if (!article) return null
            
            // Parse tags
            let tags = []
            try { tags = JSON.parse(String(ua.relevance_tags)) } catch(e) {}

            return (
              <a key={String(ua.article_id)} href={String(article.url)} target="_blank" rel="noreferrer" className="block border border-neutral-800 rounded-2xl p-5 bg-neutral-900 shadow-sm hover:border-neutral-700 transition-colors">
                <p className="text-xs text-neutral-400 mb-2 flex items-center">
                  {getIcon(String(ua.gs_paper))}
                  <span className="font-bold">{String(ua.gs_paper)}</span> <span className="mx-1">·</span> {String(ua.topic)}
                </p>
                <h3 className="text-base font-bold mb-3 leading-tight">{String(article.title)}</h3>
                <p className="text-sm text-neutral-300 mb-3 leading-relaxed border-l-2 border-orange-500/50 pl-3">
                  <span className="font-bold text-orange-400 text-xs uppercase tracking-wide block mb-1">Fact Box</span>
                  {String(ua.fact_box)}
                </p>
                <div className="text-xs text-neutral-500 flex flex-wrap gap-1 items-center mt-4">
                  <span className="mr-1 font-medium">Relevant to:</span>
                  {tags.map((t: string, i: number) => (
                    <span key={i} className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                      {t}
                    </span>
                  ))}
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* Static Footer Cards */}
      <div className="border border-neutral-800 rounded-2xl p-5 bg-neutral-900 shadow-sm mt-8">
        <p className="text-sm text-neutral-300 mb-2 font-bold flex items-center">
          <CheckSquare className="w-4 h-4 mr-2 text-neutral-400" /> Weekly digest
        </p>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Auto-compiled Mon-Sun rollup, grouped by GS paper, for batch revision.
        </p>
      </div>

      <div className="border border-orange-900/50 rounded-2xl p-5 bg-neutral-900 shadow-sm">
        <p className="text-sm text-orange-400 mb-2 font-bold flex items-center">
          <Gavel className="w-4 h-4 mr-2" /> Vaade cross-link
        </p>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Promise scorecard reused for mains answer-writing evidence.
        </p>
      </div>

    </div>
  )
}
