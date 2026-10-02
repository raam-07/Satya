import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getLastRevalidatedAt, setLastRevalidatedAt } from '@/lib/api.server';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 240 * 60 * 1000; // 4 hours: each revalidation makes every page re-query the DB
// Timelines change once a day (timeline service run), so their caches are refreshed at most twice a day.
const EVENTS_EVERY_MS = 12 * 60 * 60 * 1000;
const HI_COOLDOWN_MS = 120 * 60 * 1000; // Hindi caches: at most every 2 hours
const REPORTS_COOLDOWN_MS = 20 * 60 * 1000; // report PDF list (satya-upsc-reports builder): at most every 20 min
const g = global as any;

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const tag = searchParams.get('tag');
  const force = searchParams.get('force') === 'true';

  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();

  // Hindi service: refreshes only the Hindi caches, on its own clock, without using up the
  // main 4-hour slot (which belongs to the classifier's site-wide refresh).
  if (tag === 'hi') {
    const last = g.lastHiRevalidatedAt || 0;
    if (!force && now - last < HI_COOLDOWN_MS) {
      return NextResponse.json({ revalidated: false, reason: 'Hindi cooldown active', remaining_seconds: Math.ceil((HI_COOLDOWN_MS - (now - last)) / 1000) });
    }
    revalidateTag('hi');
    g.lastHiRevalidatedAt = now;
    return NextResponse.json({ revalidated: true, tag: 'hi', now });
  }

  // Report builder: new PDFs stored -> refresh only the report-file list (one small query) and the
  // pages that show download buttons. Own clock; doesn't use the main 4-hour slot.
  if (tag === 'upsc-reports') {
    const last = g.lastReportsRevalidatedAt || 0;
    if (!force && now - last < REPORTS_COOLDOWN_MS) {
      return NextResponse.json({ revalidated: false, reason: 'reports cooldown active', remaining_seconds: Math.ceil((REPORTS_COOLDOWN_MS - (now - last)) / 1000) });
    }
    revalidateTag('upsc-reports');
    g.lastReportsRevalidatedAt = now;
    return NextResponse.json({ revalidated: true, tag: 'upsc-reports', now });
  }

  const lastRevalidatedAt = getLastRevalidatedAt();
  if (!force && (now - lastRevalidatedAt < COOLDOWN_MS)) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastRevalidatedAt)) / 1000);
    return NextResponse.json({
      revalidated: false,
      reason: `Cooldown active. Revalidation allowed in ${remainingSeconds} seconds.`,
      remaining_seconds: remainingSeconds
    });
  }

  try {
    // Only tagged caches are refreshed. revalidatePath('/', 'layout') used to be called here too,
    // which also dropped every untouched cache (timelines, UPSC, daily stats) on each run.
    if (tag) {
      revalidateTag(tag);
      setLastRevalidatedAt(now);
      return NextResponse.json({ revalidated: true, tag, now });
    } else {
      const tags = ['articles', 'promises', 'entities', 'upsc'];
      if (now - (g.lastEventsRevalidatedAt || 0) >= EVENTS_EVERY_MS) {
        tags.push('events');
        g.lastEventsRevalidatedAt = now;
      }
      tags.forEach(t => revalidateTag(t));
      setLastRevalidatedAt(now);
      return NextResponse.json({ revalidated: true, tags, now });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Revalidation failed' }, { status: 500 });
  }
}
