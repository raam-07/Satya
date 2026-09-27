import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Cache the dashboard for 60 seconds to protect Turso read budget
export const revalidate = 60

async function forceRefresh() {
  'use server'
  // Clear the cache for the entire application layout (all pages, feeds, admin)
  revalidatePath('/', 'layout')
}

export default async function AdminPage() {
  const todayStart = Math.floor(new Date(new Date().setUTCHours(0,0,0,0)).getTime() / 1000)

  // 1. Pipeline Status Breakdown (Grouped)
  const statusRes = await db.execute("SELECT status, COUNT(*) as c FROM articles GROUP BY status")
  const statusCounts: Record<string, number> = {}
  statusRes.rows.forEach(r => {
    statusCounts[String(r.status)] = Number(r.c)
  })

  // Full pipeline lifecycle
  const pipelineStages = [
    { name: 'Scraped (New)', key: 'scraped' },
    { name: 'Rephrased', key: 'rephrased' },
    { name: 'Classified', key: 'classified' },
    { name: 'Entity Processed', key: 'entity_processed' },
    { name: 'Processed (Done)', key: 'processed' },
    { name: 'Skipped (Too Short)', key: 'skipped_short' }
  ]

  // 2. Hindi Translation Breakdown
  const translateRes = await db.execute("SELECT translated_hi, COUNT(*) as c FROM articles GROUP BY translated_hi")
  const translations = translateRes.rows.map(r => ({ state: Number(r.translated_hi), count: Number(r.c) }))

  // 3. Classified Today
  const classifiedTodayRes = await db.execute({
    sql: "SELECT COUNT(*) as c FROM articles WHERE status = 'classified' AND classified_at >= ?",
    args: [todayStart]
  })
  const classifiedToday = classifiedTodayRes.rows[0]?.c || 0

  // 4. Latest Articles Flowing Through
  const latestRes = await db.execute(
    "SELECT id, title, status, scraped_at, classified_at FROM articles ORDER BY scraped_at DESC LIMIT 15"
  )
  const latestArticles = latestRes.rows.map(r => ({
    id: r.id,
    title: r.title,
    status: r.status,
    scraped_at: r.scraped_at ? new Date(Number(r.scraped_at)*1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : 'N/A',
    classified_at: r.classified_at ? new Date(Number(r.classified_at)*1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : 'N/A'
  }))

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-orange-500">Live Pipeline Dashboard</h1>
        
        {/* Force Refresh Button */}
        <form action={forceRefresh}>
          <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg">
            Force Refresh App Cache
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-xl">
          <h2 className="text-sm uppercase text-neutral-400 font-bold mb-2">Classified Today</h2>
          <p className="text-5xl font-black text-green-400">{String(classifiedToday)}</p>
          <p className="text-xs text-neutral-500 mt-2">Will auto-refresh every 60s to save Turso reads</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Lifecycle Breakdown */}
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
          <h2 className="text-xl font-bold mb-4 border-b border-neutral-700 pb-2">Pipeline Bottleneck Status</h2>
          <ul className="space-y-3">
            {pipelineStages.map(stage => (
              <li key={stage.key} className="flex justify-between items-center">
                <span className="font-mono text-neutral-300">{stage.name}</span>
                <span className={`font-bold px-3 py-1 rounded ${
                  stage.key === 'processed' ? 'bg-green-900 text-green-300' :
                  stage.key === 'skipped_short' ? 'bg-neutral-800 text-neutral-500' :
                  'bg-orange-900 text-orange-300'
                }`}>
                  {statusCounts[stage.key] || 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Translation Status */}
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
          <h2 className="text-xl font-bold mb-4 border-b border-neutral-700 pb-2">Hindi Translation Status</h2>
          <ul className="space-y-3">
            {translations.map(t => (
              <li key={t.state} className="flex justify-between items-center">
                <span className="font-mono text-neutral-300">
                  {t.state === 1 ? '1 (Translated)' : t.state === 2 ? '2 (Failed/Skipped)' : '0 (Pending)'}
                </span>
                <span className="font-bold bg-neutral-800 px-3 py-1 rounded">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
        <h2 className="text-xl font-bold mb-4 border-b border-neutral-700 pb-2">Latest Article Activity (Scraped)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-neutral-500 uppercase text-xs">
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4 w-1/2">Title</th>
                <th className="pb-3 pr-4">Scraped At (IST)</th>
                <th className="pb-3">Classified At (IST)</th>
              </tr>
            </thead>
            <tbody className="text-sm text-neutral-300">
              {latestArticles.map(a => (
                <tr key={String(a.id)} className="border-t border-neutral-800">
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${
                      a.status === 'processed' ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
                    }`}>
                      {String(a.status)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 truncate max-w-xs">{String(a.title)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-neutral-400">{a.scraped_at}</td>
                  <td className="py-3 whitespace-nowrap text-neutral-400">{a.classified_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
