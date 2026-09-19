import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ACTIVE_WINDOW_DAYS = 60;
const UA_SAMPLE_LIMIT = 5000;

function classifyPlatform(ua: string): string {
  const s = (ua || '').toLowerCase();
  if (!s) return 'Unknown';
  if (/iphone|ipad|ipod/.test(s)) return 'iOS';
  if (/android/.test(s)) return 'Android';
  if (/windows/.test(s)) return 'Windows';
  if (/mac os x|macintosh/.test(s)) return 'macOS';
  if (/linux/.test(s)) return 'Linux';
  return 'Other';
}

function classifyBrowser(ua: string): string {
  const s = (ua || '').toLowerCase();
  if (!s) return 'Unknown';
  if (/edg\//.test(s)) return 'Edge';
  if (/opr\/|opera/.test(s)) return 'Opera';
  if (/chrome|crios/.test(s)) return 'Chrome';
  if (/firefox|fxios/.test(s)) return 'Firefox';
  if (/safari/.test(s)) return 'Safari';
  return 'Other';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    // NOTE: the ?key= fallback is deliberately gone - secrets in query strings
    // end up in server and proxy access logs. Send the Authorization header.
    const providedSecret = bearerToken;
    const expectedSecret = process.env.ADMIN_NOTIFY_KEY;

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logLimit = Math.min(Math.max(Number(searchParams.get('logs') || 10), 1), 50);
    const activeCutoff = Math.floor(Date.now() / 1000) - ACTIVE_WINDOW_DAYS * 86400;

    const [countRes, activeRes, logsRes, uaRes] = await Promise.all([
      db.execute('SELECT COUNT(*) as total FROM push_subscriptions'),
      db.execute({
        sql: 'SELECT COUNT(*) as active FROM push_subscriptions WHERE last_active >= ?',
        args: [activeCutoff],
      }),
      db.execute({
        sql: `SELECT id, title, body, url, sent_count, failed_count, purged_count, created_at
              FROM notification_logs
              ORDER BY created_at DESC
              LIMIT ?`,
        args: [logLimit],
      }),
      db.execute({
        sql: 'SELECT user_agent FROM push_subscriptions LIMIT ?',
        args: [UA_SAMPLE_LIMIT],
      }),
    ]);

    const count = Number(countRes.rows?.[0]?.total || 0);
    const activeCount = Number(activeRes.rows?.[0]?.active || 0);

    const platforms: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    for (const row of uaRes.rows || []) {
      const ua = String((row as any).user_agent || '');
      const p = classifyPlatform(ua);
      const b = classifyBrowser(ua);
      platforms[p] = (platforms[p] || 0) + 1;
      browsers[b] = (browsers[b] || 0) + 1;
    }

    const toSortedList = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const hasPublicKey = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const hasPrivateKey = Boolean(process.env.VAPID_PRIVATE_KEY);

    return NextResponse.json({
      success: true,
      subscriberCount: count,
      activeCount,
      staleCount: Math.max(0, count - activeCount),
      activeWindowDays: ACTIVE_WINDOW_DAYS,
      platforms: toSortedList(platforms),
      browsers: toSortedList(browsers),
      recentLogs: logsRes.rows || [],
      vapidConfigured: hasPublicKey && hasPrivateKey,
      vapidSubject: process.env.VAPID_SUBJECT || null,
    });
  } catch (error: any) {
    console.error('Error fetching notification status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
