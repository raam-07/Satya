import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Public VAPID key lookup.
 *
 * This key is public by design - it is already shipped to every browser in the
 * client bundle. Exposing it here lets the service worker re-subscribe on its
 * own when the browser rotates a subscription (pushsubscriptionchange), without
 * waiting for the user to open the site again.
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
  return NextResponse.json(
    { publicKey },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
}
