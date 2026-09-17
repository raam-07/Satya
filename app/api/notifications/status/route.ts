import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const providedSecret = bearerToken || searchParams.get('key');
    const expectedSecret = process.env.ADMIN_NOTIFY_KEY;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Subscriber count
    const countRes = await db.execute('SELECT COUNT(*) as total FROM push_subscriptions');
    const count = Number(countRes.rows?.[0]?.total || 0);

    // Recent logs
    const logsRes = await db.execute(`
      SELECT id, title, body, url, sent_count, failed_count, purged_count, created_at
      FROM notification_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const hasPublicKey = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const hasPrivateKey = Boolean(process.env.VAPID_PRIVATE_KEY);

    return NextResponse.json({
      success: true,
      subscriberCount: count,
      recentLogs: logsRes.rows || [],
      vapidConfigured: hasPublicKey && hasPrivateKey,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
  } catch (error: any) {
    console.error('Error fetching notification status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
