import { upscDb } from '@/lib/db.upsc'
import { db } from '@/lib/db'
import { CheckSquare, Circle, AlertCircle, Scale, Gavel, Users, BookOpen, ExternalLink, Activity } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 60

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

  // Join with MAIN DB
  const articleIds = upscArticles.map(a => a.article_id)
  let mainArticles: Record<string, any> = {}
  
  if (articleIds.length > 0) {
    const placeholders = articleIds.map(() => '?').join(',')
    const mainRes = await db.execute({
      sql: `SELECT id, title, url, scraped_at FROM articles WHERE id IN (${placeholders})`,
      args: articleIds
    })
    mainRes.rows.forEach(r => {
      mainArticles[String(r.id)] = r
    })
  }

  const papers = ['All', 'GS1', 'GS2', 'GS3', 'GS4', 'Prelims facts']

  const getIcon = (paper: string) => {
    switch (paper) {
      case 'GS1': return <Users className="w-4 h-4 mr-1.5 inline text-blue-400" />
      case 'GS2': return <Gavel className="w-4 h-4 mr-1.5 inline text-indigo-400" />
      case 'GS3': return <Scale className="w-4 h-4 mr-1.5 inline text-emerald-400" />
      case 'GS4': return <AlertCircle className="w-4 h-4 mr-1.5 inline text-rose-400" />
      default: return <BookOpen className="w-4 h-4 mr-1.5 inline text-orange-400" />
    }
  }

  const getPaperColor = (paper: string) => {
    switch (paper) {
      case 'GS1': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'GS2': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      case 'GS3': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'GS4': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default: return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 text-neutral-200 pb-24 font-sans selection:bg-orange-500/30">
      
      {/* Header */}
      <div className="relative overflow-hidden border border-neutral-800 rounded-3xl p-8 bg-neutral-900/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-xs text-orange-500/80 mb-2 uppercase tracking-widest font-bold flex items-center">
            <Activity className="w-3 h-3 mr-2 animate-pulse" /> Live Analysis
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight text-white">UPSC Current Affairs</h1>
          <p className="text-sm text-neutral-400 font-medium">Auto-extracted facts mapped to GS Papers, updated continuously.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 text-center shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
          <p className="text-xs text-neutral-400 mb-2 uppercase tracking-widest font-bold">Processed Today</p>
          <p className="text-5xl font-black text-white mb-1 tracking-tighter">{String(todayCount)}</p>
          <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 inline-block px-2 py-1 rounded-md">high-value articles</p>
        </div>
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 text-center shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
          <p className="text-xs text-neutral-400 mb-2 uppercase tracking-widest font-bold">This Week</p>
          <p className="text-5xl font-black text-white mb-1 tracking-tighter">{String(weekCount)}</p>
          <p className="text-xs text-indigo-500 font-semibold bg-indigo-500/10 inline-block px-2 py-1 rounded-md">articles tagged</p>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-neutral-800 rounded-3xl p-6 bg-neutral-900/50 backdrop-blur-sm shadow-lg sticky top-4 z-20">
        <p className="text-xs text-neutral-500 mb-4 uppercase tracking-widest font-bold">Filter Syllabus</p>
        <div className="flex flex-wrap gap-2.5">
          {papers.map(p => (
            <Link key={p} href={`/upsc${p === 'All' ? '' : `?paper=${p}`}`}>
              <span className={`text-sm px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer border font-semibold inline-flex items-center shadow-sm ${
                selectedPaper === p 
                  ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/25 shadow-lg scale-105' 
                  : 'bg-neutral-800/80 text-neutral-400 border-neutral-700/50 hover:bg-neutral-700 hover:text-neutral-200 hover:border-neutral-600'
              }`}>
                {p}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-5">
        {upscArticles.length === 0 ? (
          <div className="text-center border border-neutral-800 border-dashed rounded-3xl py-20 bg-neutral-900/30">
            <BookOpen className="w-10 h-10 mx-auto text-neutral-700 mb-4" />
            <p className="text-neutral-500 font-medium">No UPSC articles found for this filter yet.</p>
            <p className="text-sm text-neutral-600 mt-2">The AI is currently processing the backlog.</p>
          </div>
        ) : (
          upscArticles.map((ua) => {
            const article = mainArticles[String(ua.article_id)]
            if (!article) return null
            
            let tags = []
            try { tags = JSON.parse(String(ua.relevance_tags)) } catch(e) {}
            
            const dateStr = article.scraped_at 
              ? new Date(Number(article.scraped_at) * 1000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
              : 'Recent'

            return (
              <a key={String(ua.article_id)} href={String(article.url)} target="_blank" rel="noreferrer" className="group block border border-neutral-800 rounded-3xl p-6 bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-xl hover:border-neutral-600 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/20 group-hover:bg-orange-500 transition-colors" />
                
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center shadow-sm ${getPaperColor(String(ua.gs_paper))}`}>
                    {getIcon(String(ua.gs_paper))}
                    {String(ua.gs_paper)} <span className="opacity-40 mx-2">|</span> {String(ua.topic)}
                  </span>
                  <span className="text-xs font-medium text-neutral-500 bg-neutral-800/50 px-2 py-1 rounded-md">{dateStr}</span>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold mb-4 leading-snug text-white group-hover:text-orange-400 transition-colors pr-8">
                  {String(article.title)}
                  <ExternalLink className="w-4 h-4 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1" />
                </h3>
                
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 mb-5 relative">
                  <div className="absolute top-0 left-4 -mt-2 bg-neutral-900 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Extraction
                  </div>
                  <p className="text-sm md:text-base text-neutral-300 leading-relaxed pt-2">
                    {String(ua.fact_box)}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-2">Tags</span>
                  {tags.map((t: string, i: number) => (
                    <span key={i} className="bg-neutral-800 border border-neutral-700/50 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 shadow-sm">
                      #{t.replace(/\s+/g, '')}
                    </span>
                  ))}
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* Static Footer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-neutral-800/50">
        <div className="border border-neutral-800 rounded-3xl p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 shadow-lg group hover:border-neutral-700 transition-colors">
          <div className="bg-blue-500/10 w-10 h-10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CheckSquare className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-base text-white mb-2 font-bold">Weekly Digest Module</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Auto-compiled Mon-Sun rollup, grouped by GS paper, ready for batch revision and PDF export.
          </p>
        </div>

        <div className="border border-neutral-800 rounded-3xl p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 shadow-lg group hover:border-orange-500/30 transition-colors">
          <div className="bg-orange-500/10 w-10 h-10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Gavel className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-base text-white mb-2 font-bold">Vaade Cross-Link</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Directly cross-reference political promises with actual implementation metrics for mains answer-writing evidence.
          </p>
        </div>
      </div>

    </div>
  )
}
