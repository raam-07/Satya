import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subscription = body.subscription || body;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    const userAgent = body.userAgent || req.headers.get('user-agent') || '';

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Missing required push subscription parameters (endpoint, p256dh, auth)' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, created_at, last_active)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              p256dh = excluded.p256dh,
              auth = excluded.auth,
              user_agent = excluded.user_agent,
              last_active = excluded.last_active`,
      args: [endpoint, p256dh, auth, userAgent, now, now],
    });

    return NextResponse.json({ success: true, message: 'Push subscription stored successfully' });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to register push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = body.endpoint;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required to unsubscribe' }, { status: 400 });
    }

    await db.execute({
      sql: `DELETE FROM push_subscriptions WHERE endpoint = ?`,
      args: [endpoint],
    });

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error: any) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}
