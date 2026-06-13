import { NextRequest, NextResponse } from 'next/server';
import { serverApi } from '@/lib/api.server';

export const revalidate = 60; // Cache API responses for 60 seconds

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const param = searchParams.get('param') || '';

  try {
    switch (type) {
      case 'indiaOverview':
        return NextResponse.json(await serverApi.indiaOverview());
      case 'manifest':
        return NextResponse.json(await serverApi.manifest());
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
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('API Router Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
