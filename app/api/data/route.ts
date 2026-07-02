import { NextRequest, NextResponse } from 'next/server';
import { serverApi } from '@/lib/api.server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const param = searchParams.get('param') || '';

  try {
    switch (type) {
      case 'refresh':
        const secret = searchParams.get('secret');
        const expectedSecret = process.env.REVALIDATE_SECRET;
        if (!expectedSecret || secret !== expectedSecret) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { clearCache } = await import('@/lib/api.server');
        clearCache();
        return NextResponse.json({ success: true });
      case 'indiaOverview':
        return NextResponse.json(await serverApi.indiaOverview());
      case 'manifest':
        return NextResponse.json(await serverApi.manifest());
      case 'politicians':
        return NextResponse.json(await serverApi.politicians());
      case 'party':
        return NextResponse.json(await serverApi.party(param));
      case 'minister':
        return NextResponse.json(await serverApi.minister(param));
      case 'state':
        return NextResponse.json(await serverApi.state(param));
      case 'topic':
        return NextResponse.json(await serverApi.topic(param));
      case 'promises':
        return NextResponse.json(await serverApi.promises());
      case 'category':
        return NextResponse.json(await serverApi.category(param));
      case 'feed':
        return NextResponse.json(await serverApi.feed(param));
      case 'search':
        return NextResponse.json(await serverApi.search(param));
      case 'source':
        return NextResponse.json(await serverApi.source(param));
      case 'article':
        const artId = parseInt(param, 10);
        if (isNaN(artId)) return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
        return NextResponse.json(await serverApi.article(artId));
      case 'articleContent':
        const id = parseInt(param, 10);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
        return NextResponse.json(await serverApi.articleContent(id));
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('API Router Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
