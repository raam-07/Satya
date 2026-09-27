import { NextRequest, NextResponse } from 'next/server'
import { getUpscStats, getUpscTag, nodeLabel, subjectLabel } from '@/lib/upsc'

export const dynamic = 'force-dynamic'

// GET /api/upsc              -> { today, week }            (home-feed strip)
// GET /api/upsc?article=123  -> { tag: {...} | null }      (article chip)
// Read at view time on purpose: article and home pages are statically cached
// long before their UPSC note exists.
export async function GET(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get('article'))
  const headers = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' }
  if (id) {
    const t = await getUpscTag(id)
    const tag = t && {
      ...t,
      subjectLabel: subjectLabel(t.subject),
      nodeLabel: nodeLabel(t.subject, t.node),
    }
    return NextResponse.json({ tag }, { headers })
  }
  const s = await getUpscStats()
  return NextResponse.json({ today: s.today, week: s.week }, { headers })
}
