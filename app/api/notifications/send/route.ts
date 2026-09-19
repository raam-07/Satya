import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/db';
import { markEndpointsDead } from '@/lib/pushStore';

export const dynamic = 'force-dynamic';
// Broadcasting to a large subscriber base can take a while; give it room.
export const maxDuration = 300;

/**
 * Push payload budget. Web Push caps the encrypted payload at ~4KB across push
 * services, so we keep the visible text well inside that and truncate rather
 * than let one long headline fail the entire broadcast.
 */
const MAX_TITLE = 120;
const MAX_BODY = 350;

function clamp(value: string, max: number): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

type SendOutcome =
  | { status: 'sent'; id: number }
  | { status: 'gone'; id: number; endpoint: string }
  | { status: 'rejected'; id: number; endpoint: string; error: string; statusCode?: number }
  | { status: 'failed'; id: number; error: string; statusCode?: number };

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

    const title = clamp(body.title || '', MAX_TITLE);
    if (!title) {
      return NextResponse.json({ error: 'Title is required for notification.' }, { status: 400 });
    }

    const notificationBody = clamp(body.body || '', MAX_BODY);
    const targetUrl = body.url?.trim() || '/';
    const tag = body.tag || 'satya-alert';
    const icon = body.icon || '/favicons/gavel-192.png';
    const badge = body.badge || '/favicons/gavel-32.png';
    const image = typeof body.image === 'string' && body.image.trim() ? body.image.trim() : undefined;
    const requireInteraction = Boolean(body.requireInteraction);
    const actions = Array.isArray(body.actions) ? body.actions.slice(0, 2) : undefined;

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
      image,
      requireInteraction,
      actions,
      timestamp: Date.now(),
    });

    if (payload.length > 3800) {
      return NextResponse.json(
        { error: `Notification payload is too large (${payload.length} bytes). Shorten the text or drop the image URL.` },
        { status: 400 }
      );
    }

    // --- Single-target test mode -------------------------------------------
    if (body.testSubscription) {
      const sub = body.testSubscription;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          payload
        );
        return NextResponse.json({ success: true, test: true, message: 'Test notification delivered successfully' });
      } catch (err: any) {
        const statusCode = err?.statusCode;

        // A test that comes back gone/rejected is proof this endpoint is dead.
        // Record it so the next page load silently swaps in a fresh subscription
        // rather than leaving the tester to fix it by hand.
        if (statusCode === 404 || statusCode === 410 || statusCode === 403) {
          await markEndpointsDead([{ endpoint: sub.endpoint, statusCode }]).catch(() => {});
        }

        return NextResponse.json(
          {
            error: `Test notification failed: ${err.message}`,
            statusCode,
            detail: err?.body,
            willSelfHeal: statusCode === 404 || statusCode === 410 || statusCode === 403,
          },
          { status: 500 }
        );
      }
    }

    // --- Broadcast ----------------------------------------------------------
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

    /**
     * Purge policy.
     *
     * 404 / 410 come straight from the push service and mean the subscription
     * genuinely no longer exists - those are always safe to delete.
     *
     * 403 is ambiguous. It usually means "signed with an outdated VAPID key",
     * but it is ALSO what every single subscriber returns when OUR OWN config
     * is broken (mismatched key pair, malformed VAPID subject, clock skew).
     * Deleting on 403 unconditionally means one bad env var can wipe the entire
     * subscriber list in a single broadcast. So 403s are quarantined and only
     * purged if the run as a whole looks healthy.
     */
    const goneIds: number[] = [];
    const rejectedIds: number[] = [];
    const deadEndpoints: Array<{ endpoint: string; statusCode?: number }> = [];
    const failureDetails: Array<{ id?: number; error: string; statusCode?: number }> = [];

    const BATCH_SIZE = 100;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (row: any): Promise<SendOutcome> => {
          const id = Number(row.id);
          const endpoint = String(row.endpoint);
          const p256dh = String(row.p256dh);
          const auth = String(row.auth);

          try {
            await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload);
            return { status: 'sent', id };
          } catch (error: any) {
            const statusCode = error?.statusCode;
            const message = error?.body || error?.message || String(error);

            if (statusCode === 404 || statusCode === 410) {
              return { status: 'gone', id, endpoint };
            }
            if (statusCode === 403) {
              return { status: 'rejected', id, endpoint, error: message, statusCode };
            }

            console.error(`Failed to push to subscriber ${id}:`, message);
            return { status: 'failed', id, error: message, statusCode };
          }
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          const outcome = r.value;
          if (outcome.status === 'sent') {
            sent++;
          } else if (outcome.status === 'gone') {
            goneIds.push(outcome.id);
            deadEndpoints.push({ endpoint: outcome.endpoint, statusCode: 410 });
          } else if (outcome.status === 'rejected') {
            rejectedIds.push(outcome.id);
            deadEndpoints.push({ endpoint: outcome.endpoint, statusCode: outcome.statusCode });
            failureDetails.push({ id: outcome.id, error: outcome.error, statusCode: outcome.statusCode });
          } else {
            failed++;
            failureDetails.push({ id: outcome.id, error: outcome.error, statusCode: outcome.statusCode });
          }
        } else {
          failed++;
          failureDetails.push({ error: r.reason?.message || String(r.reason) });
        }
      }
    }

    // --- Safety valve -------------------------------------------------------
    // If almost nothing got through, the problem is far more likely to be our
    // configuration than every subscriber simultaneously going stale. In that
    // case we keep every row and tell the operator to investigate.
    const total = rows.length;
    const unreachable = goneIds.length + rejectedIds.length + failed;
    const successRate = total > 0 ? sent / total : 0;
    const looksLikeServerFault = total >= 5 && successRate < 0.5;

    let purged = 0;
    let purgeSkipped = false;
    let warning: string | undefined;

    const idsToPurge = looksLikeServerFault ? [] : [...goneIds, ...rejectedIds];

    if (looksLikeServerFault) {
      purgeSkipped = true;
      warning =
        `Purge skipped as a safety measure: only ${sent} of ${total} sends succeeded ` +
        `(${unreachable} unreachable). A near-total failure usually means a server-side ` +
        `problem - mismatched VAPID key pair, bad VAPID_SUBJECT, or clock skew - not that ` +
        `every subscriber expired at once. No subscriptions were deleted. Verify your VAPID ` +
        `configuration and send again.`;
      console.error('[notifications] ' + warning);
    } else if (idsToPurge.length > 0) {
      // One statement instead of N round trips to Turso.
      const placeholders = idsToPurge.map(() => '?').join(',');
      try {
        await db.execute({
          sql: `DELETE FROM push_subscriptions WHERE id IN (${placeholders})`,
          args: idsToPurge,
        });
        purged = idsToPurge.length;

        // Remember these endpoints. Without this the browser hands the same dead
        // endpoint back on the user's next visit and it gets re-registered forever.
        await markEndpointsDead(deadEndpoints).catch((e) =>
          console.error('Failed to record dead endpoints:', e)
        );
      } catch (e) {
        console.error('Failed to purge dead subscriptions:', e);
      }
    }

    // Failures we did not purge still count as failures for reporting.
    const reportedFailed = failed + (purgeSkipped ? rejectedIds.length : 0);

    const now = Math.floor(Date.now() / 1000);
    await db
      .execute({
        sql: `INSERT INTO notification_logs (title, body, url, sent_count, failed_count, purged_count, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [title, notificationBody, targetUrl, sent, reportedFailed, purged, now],
      })
      .catch((e) => console.error('Failed to write notification log:', e));

    return NextResponse.json({
      success: true,
      sent,
      failed: reportedFailed,
      purged,
      total,
      purgeSkipped,
      warning,
      failures: failureDetails.length > 0 ? failureDetails.slice(0, 50) : undefined,
    });
  } catch (error: any) {
    console.error('Error broadcasting push notification:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while broadcasting' },
      { status: 500 }
    );
  }
}
