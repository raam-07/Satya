import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const tag = searchParams.get('tag');

  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({ revalidated: true, tag, now: Date.now() });
    } else {
      revalidateTag('articles');
      revalidateTag('promises');
      revalidateTag('entities');
      return NextResponse.json({ revalidated: true, tags: ['articles', 'promises', 'entities'], now: Date.now() });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Revalidation failed' }, { status: 500 });
  }
}
