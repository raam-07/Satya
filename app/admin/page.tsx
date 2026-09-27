import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AdminDashboardClient } from '@/components/AdminDashboardClient'

// Cache the dashboard for 60 seconds to protect Turso read budget
export const revalidate = 60

async function forceRefresh() {
  'use server'
  // Clear the cache for the entire application layout (all pages, feeds, admin)
  revalidatePath('/', 'layout')
}

export default async function AdminPage() {
  const todayStart = Math.floor(new Date(new Date().setUTCHours(0,0,0,0)).getTime() / 1000)

  // 1. Classified Today
  const classifiedTodayRes = await db.execute({
    sql: "SELECT COUNT(*) as c FROM articles WHERE status = 'classified' AND classified_at >= ?",
    args: [todayStart]
  })
  const classifiedToday = classifiedTodayRes.rows[0]?.c || 0

  // 2. Latest Articles Flowing Through
  const latestRes = await db.execute(
    "SELECT id, title, status, scraped_at, classified_at FROM articles ORDER BY scraped_at DESC LIMIT 10"
  )
  const latestArticles = latestRes.rows.map(r => ({
    id: r.id,
    title: r.title,
    status: r.status,
    scraped_at: r.scraped_at ? new Date(Number(r.scraped_at)*1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : 'N/A',
    classified_at: r.classified_at ? new Date(Number(r.classified_at)*1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : 'N/A'
  }))

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">Live Pipeline Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-2">Server caches data for 60s to protect Turso read limits.</p>
        </div>
        
        {/* Force Refresh Button */}
        <form action={forceRefresh}>
          <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-black font-black py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-orange-400 uppercase tracking-wide transition-all">
            Force Refresh App Cache
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-xl">
          <h2 className="text-sm uppercase text-neutral-400 font-bold mb-2">Classified Today</h2>
          <p className="text-5xl font-black text-green-400">{String(classifiedToday)}</p>
        </div>
      </div>

      {/* Interactive Charts Client Component */}
      <AdminDashboardClient />

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 mt-12">
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
