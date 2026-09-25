import { NextRequest, NextResponse } from 'next/server'
import { submitChangedUrls } from '@/lib/indexnow'

export const dynamic = 'force-dynamic'

/**
 * GET  /api/indexnow  -> dry run: what would be submitted right now. Changes nothing.
 * POST /api/indexnow  -> submit every new or changed indexable URL.
 *
 * POST is deliberately open. It only ever sends this site's own URLs, and only
 * the ones that changed since they were last accepted, so calling it twice in a
 * row sends nothing the second time. That makes it safe for the scheduled
 * GitHub Action, or any pipeline step, to call without holding a secret. It
 * reads nothing /sitemap.xml does not already expose publicly.
 *
 * POST ?force=true resubmits everything and is the one thing that could get the
 * key throttled if abused, so it needs Authorization: Bearer <REVALIDATE_SECRET>.
 */
export async function GET() {
  try {
    const result = await submitChangedUrls({ dryRun: true })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Dry run failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const force = new URL(req.url).searchParams.get('force') === 'true'

  if (force) {
    const expected = process.env.REVALIDATE_SECRET
    const auth = req.headers.get('authorization')
    const provided = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!expected || provided !== expected) {
      return NextResponse.json({ ok: false, error: 'force=true requires Authorization: Bearer <REVALIDATE_SECRET>' }, { status: 401 })
    }
  }

  try {
    const result = await submitChangedUrls({ force })
    if (result.submitted > 0 || !result.ok) {
      console.log('[indexnow]', JSON.stringify({ due: result.due, submitted: result.submitted, status: result.status, error: result.error }))
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err: any) {
    console.error('[indexnow] run failed:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Submission failed' }, { status: 500 })
  }
}
