import { upscDb } from '@/lib/db.upsc'
import { db } from '@/lib/db'
import { CheckSquare, AlertCircle, Scale, Gavel, Users, BookOpen } from 'lucide-react'
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
      case 'GS1': return <Users className="w-3.5 h-3.5 mr-1 inline" />
      case 'GS2': return <Gavel className="w-3.5 h-3.5 mr-1 inline" />
      case 'GS3': return <Scale className="w-3.5 h-3.5 mr-1 inline" />
      case 'GS4': return <AlertCircle className="w-3.5 h-3.5 mr-1 inline" />
      default: return <BookOpen className="w-3.5 h-3.5 mr-1 inline" />
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-3 font-sans text-[#E5E7EB] bg-black min-h-screen">
      
      {/* Header */}
      <div className="border border-[#262626] rounded-xl px-5 py-4 bg-[#111111]">
        <p className="text-[13px] text-[#A1A1AA] m-0 mb-1">Header</p>
        <h1 className="text-[15px] font-medium m-0 text-white">UPSC Current Affairs</h1>
        <p className="text-[13px] text-[#A1A1AA] m-0 mt-1">GS-paper tagged · sourced from live feed</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-4 text-center">
          <p className="text-[13px] text-[#A1A1AA] m-0 mb-1">Today</p>
          <p className="text-[24px] font-medium m-0 text-white">{String(todayCount)}</p>
          <p className="text-[12px] text-[#71717A] m-0 mt-1">tagged articles</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-4 text-center">
          <p className="text-[13px] text-[#A1A1AA] m-0 mb-1">This week</p>
          <p className="text-[24px] font-medium m-0 text-white">{String(weekCount)}</p>
          <p className="text-[12px] text-[#71717A] m-0 mt-1">tagged articles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-[#262626] rounded-xl px-5 py-4 bg-[#111111]">
        <p className="text-[13px] text-[#A1A1AA] m-0 mb-2">Filter by GS paper</p>
        <div className="flex flex-wrap gap-1.5">
          {papers.map(p => (
            <Link key={p} href={`/upsc${p === 'All' ? '' : `?paper=${p}`}`}>
              <span className={`text-[12px] px-2.5 py-1 rounded-md transition-colors block ${
                selectedPaper === p 
                  ? 'bg-orange-500/20 text-orange-500' 
                  : 'bg-[#0A0A0A] text-[#A1A1AA] border border-[#262626] hover:bg-[#1A1A1A]'
              }`}>
                {p}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-3">
        {upscArticles.length === 0 ? (
          <p className="text-center text-[13px] text-[#71717A] py-10">No articles found.</p>
        ) : (
          upscArticles.map((ua) => {
            const article = mainArticles[String(ua.article_id)]
            if (!article) return null
            
            let tags = []
            try { tags = JSON.parse(String(ua.relevance_tags)) } catch(e) {}

            return (
              <a key={String(ua.article_id)} href={String(article.url)} target="_blank" rel="noreferrer" className="block border border-[#262626] rounded-xl px-5 py-4 bg-[#111111] hover:border-[#404040] transition-colors">
                <p className="text-[12px] text-[#A1A1AA] m-0 mb-1 flex items-center">
                  {getIcon(String(ua.gs_paper))}
                  {String(ua.gs_paper)} <span className="mx-1">·</span> {String(ua.topic)}
                </p>
                <h3 className="text-[15px] font-medium m-0 mb-1.5 text-white">{String(article.title)}</h3>
                <p className="text-[13px] text-[#A1A1AA] m-0 mb-2 leading-relaxed">
                  <span className="font-medium text-[#E5E7EB]">Fact box:</span> {String(ua.fact_box)}
                </p>
                <p className="text-[12px] text-[#71717A] m-0">
                  Relevant to: {tags.join(', ')}
                </p>
              </a>
            )
          })
        )}
      </div>

      {/* Static Footer Cards */}
      <div className="border border-[#262626] rounded-xl px-5 py-4 bg-[#0A0A0A] mt-2">
        <p className="text-[13px] text-[#A1A1AA] m-0 mb-1.5 flex items-center">
          <CheckSquare className="w-3.5 h-3.5 mr-1" /> Weekly digest
        </p>
        <p className="text-[13px] text-[#A1A1AA] m-0 leading-relaxed">
          Auto-compiled Mon-Sun rollup, grouped by GS paper, for batch revision.
        </p>
      </div>

      <div className="border border-orange-900/50 rounded-xl px-5 py-4 bg-[#111111]">
        <p className="text-[13px] text-[#A1A1AA] m-0 mb-1.5 flex items-center">
          <Gavel className="w-3.5 h-3.5 mr-1" /> Vaade cross-link
        </p>
        <p className="text-[13px] text-[#A1A1AA] m-0 leading-relaxed">
          Promise scorecard reused for mains answer-writing evidence.
        </p>
      </div>

    </div>
  )
}
