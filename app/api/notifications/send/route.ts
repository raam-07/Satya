import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const providedSecret = bearerToken || body.secret;
    const expectedSecret = process.env.ADMIN_NOTIFY_KEY;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized. Invalid admin secret.' }, { status: 401 });
    }

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: 'Title is required for notification.' }, { status: 400 });
    }

    const notificationBody = body.body?.trim() || '';
    const targetUrl = body.url?.trim() || '/';
    const tag = body.tag || 'satya-alert';
    const icon = body.icon || '/favicons/gavel-180.png';
    const badge = body.badge || '/favicons/gavel-32.png';

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:thesatyadheesh@gmail.com';

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: 'VAPID credentials (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY) not configured in environment.' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title,
      body: notificationBody,
      url: targetUrl,
      tag,
      icon,
      badge,
    });

    // Handle single-target test mode
    if (body.testSubscription) {
      const sub = body.testSubscription;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload
        );
        return NextResponse.json({ success: true, message: 'Test notification delivered successfully' });
      } catch (err: any) {
        return NextResponse.json(
          { error: `Test notification failed: ${err.message}` },
          { status: 500 }
        );
      }
    }

    // Query all active subscriptions
    const queryRes = await db.execute('SELECT id, endpoint, p256dh, auth FROM push_subscriptions');
    const rows = queryRes.rows || [];

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscribers registered yet',
        sent: 0,
        failed: 0,
        purged: 0,
        total: 0,
      });
    }

    let sent = 0;
    let failed = 0;
    let purged = 0;
    const idsToPurge: number[] = [];

    // Send in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      rows.map(async (row: any) => {
        const id = Number(row.id);
        const endpoint = String(row.endpoint);
        const p256dh = String(row.p256dh);
        const auth = String(row.auth);

        try {
          await webpush.sendNotification(
            {
              endpoint,
              keys: { p256dh, auth },
            },
            payload
          );
          return { status: 'sent', id };
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410 || error.statusCode === 403) {
            // Subscription expired, revoked, or signed with outdated VAPID key
            idsToPurge.push(id);
            return { status: 'purged', id };
          }
          console.error(`Failed to push to subscriber ${id}:`, error?.message || error);
          return {
            status: 'failed',
            id,
            error: error?.body || error?.message || String(error),
            statusCode: error?.statusCode,
          };
        }
      })
    );

    const failureDetails: Array<{ id?: number; error: string; statusCode?: number }> = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status === 'sent') sent++;
        else if (r.value.status === 'purged') purged++;
        else {
          failed++;
          failureDetails.push({
            id: r.value.id,
            error: r.value.error || 'Unknown error',
            statusCode: r.value.statusCode,
          });
        }
      } else {
        failed++;
        failureDetails.push({
          error: r.reason?.message || String(r.reason),
        });
      }
    }

    // Purge expired endpoints
    if (idsToPurge.length > 0) {
      for (const id of idsToPurge) {
        await db.execute({
          sql: 'DELETE FROM push_subscriptions WHERE id = ?',
          args: [id],
        }).catch(() => {});
      }
    }

    // Log notification in notification_logs
    const now = Math.floor(Date.now() / 1000);
    await db.execute({
      sql: `INSERT INTO notification_logs (title, body, url, sent_count, failed_count, purged_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [title, notificationBody, targetUrl, sent, failed, purged, now],
    }).catch(e => console.error('Failed to write notification log:', e));

    return NextResponse.json({
      success: true,
      sent,
      failed,
      purged,
      total: rows.length,
      failures: failureDetails.length > 0 ? failureDetails : undefined,
    });
  } catch (error: any) {
    console.error('Error broadcasting push notification:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while broadcasting' },
      { status: 500 }
    );
  }
}
