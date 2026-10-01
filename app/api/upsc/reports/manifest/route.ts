import { NextRequest, NextResponse } from 'next/server'
import {
  availablePeriods, buildReport, getReportFiles, reportFileKey, reportPublishable,
  REPORT_KINDS, type Period,
} from '@/lib/upscReports'
import { istDayStart } from '@/lib/upsc'
import type { Language } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

// For the PDF builder job: every report that should exist, with its current content hash
// and the hash of the stored PDF. The job rebuilds only the ones whose hashes differ.
// Default: recent periods (last 7 days, this + last week, this + last month). ?all=1: everything.
export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.get('all') === '1'
  const avail = await availablePeriods()
  const today = istDayStart()
  const pick: Period[] = []
  for (const kind of REPORT_KINDS) {
    const list = avail[kind]
    if (all) pick.push(...list)
    else if (kind === 'daily') pick.push(...list.filter(p => p.start >= today - 7 * 86400))
    else pick.push(...list.slice(0, 2))
  }

  const files = await getReportFiles()
  const out: any[] = []
  const jobs = pick.flatMap(p => (['en', 'hi'] as Language[]).map(lang => ({ p, lang })))
  for (let i = 0; i < jobs.length; i += 4) {
    const batch = await Promise.all(jobs.slice(i, i + 4).map(async ({ p, lang }) => {
      const r = await buildReport(p, lang)
      if (!r) return null
      const key = reportFileKey(p.kind, p.key, lang)
      return {
        file_key: key, kind: p.kind, period: p.key, lang,
        hash: r.hash, items: r.selected, total_notes: r.totalNotes,
        hi_share: Math.round(r.hiShare * 1000) / 1000,
        publishable: reportPublishable(r),
        stored_hash: files[key]?.hash ?? null,
        print_path: `/upsc/reports/print/${p.kind}/${p.key}${lang === 'hi' ? '?lang=hi' : ''}`,
        title: r.title,
      }
    }))
    batch.forEach(x => x && out.push(x))
  }
  return NextResponse.json({ generated_at: new Date().toISOString(), reports: out }, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}
