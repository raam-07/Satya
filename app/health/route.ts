import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkHealth() {
  try {
    // Run a quick query to test database connectivity
    await db.execute("SELECT 1");
    return { status: 'ok', database: 'connected' };
  } catch (e: any) {
    return { status: 'error', database: 'disconnected', error: e.message || String(e) };
  }
}

export async function GET(req: NextRequest) {
  const health = await checkHealth();
  if (health.status === 'ok') {
    return NextResponse.json(
      { status: 'healthy', database: 'connected', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      { status: 'unhealthy', database: 'error', details: health.error, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function HEAD(req: NextRequest) {
  const health = await checkHealth();
  if (health.status === 'ok') {
    return new Response(null, { status: 200 });
  } else {
    return new Response(null, { status: 500 });
  }
}
