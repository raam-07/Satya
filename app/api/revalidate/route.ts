import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { getLastRevalidatedAt, setLastRevalidatedAt } from '@/lib/api.server';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 120 * 60 * 1000; // 120 minutes

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
    if (tag) {
      revalidateTag(tag);
      revalidatePath('/', 'layout');
      setLastRevalidatedAt(now);
      return NextResponse.json({ revalidated: true, tag, now });
    } else {
      revalidateTag('articles');
      revalidateTag('promises');
      revalidateTag('entities');
      revalidatePath('/', 'layout');
      setLastRevalidatedAt(now);
      return NextResponse.json({ revalidated: true, tags: ['articles', 'promises', 'entities'], now });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Revalidation failed' }, { status: 500 });
  }
}
