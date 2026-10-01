import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { refreshSiteStats } from '@/lib/siteStats';
import { pruneDataCache } from '@/lib/dataCachePrune';

export const dynamic = 'force-dynamic';

// Called once a day by a scheduled GitHub workflow. Recomputes the site-wide counts
// (home/overview, about ledger, party/minister/state/topic totals, source sitemap)
// into the site_stats table, then refreshes only the caches that read them.
// ?full=1 recounts all-time totals from scratch (after a bulk re-tag of old articles).
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || searchParams.get('secret') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await refreshSiteStats(searchParams.get('full') === '1');
    revalidateTag('stats');
    const pruned = await pruneDataCache();
    return NextResponse.json({ ok: true, ...result, cache_pruned: pruned });
  } catch (e: any) {
    console.error('[site-stats] refresh failed:', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
