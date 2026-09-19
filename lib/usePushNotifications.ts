'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Resolve a usable service worker registration.
 *
 * navigator.serviceWorker.ready NEVER rejects. If no worker was ever registered
 * it simply hangs forever, so every caller that awaits it stalls with no error,
 * no rejection and nothing in the console - the subscribe button just spins and
 * no notification ever arrives. Register explicitly when nothing is there, and
 * put a ceiling on the wait so a stall surfaces as a real error instead.
 */
export async function getReadyRegistration(timeoutMs = 10000): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) {
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  }

  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('The service worker never became ready. Reload the page and try again.')),
      timeoutMs
    );
  });

  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { showToast } = useToast();

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // Initialize and check current status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as NotificationPermissionState);

    // Check and auto-sync subscription if permission was already granted
    getReadyRegistration()
      .then(async (reg) => {
        let sub = await reg.pushManager.getSubscription();

        // If a subscription exists, verify that it was created with the current VAPID key
        if (sub && vapidPublicKey) {
          try {
            const currentKeyBytes = urlBase64ToUint8Array(vapidPublicKey);
            const rawExistingKey = sub.options.applicationServerKey;
            if (rawExistingKey) {
              const existingBytes = new Uint8Array(rawExistingKey);
              const isMatch =
                currentKeyBytes.length === existingBytes.length &&
                currentKeyBytes.every((b, i) => b === existingBytes[i]);

              if (!isMatch) {
                // Key rotated: unsubscribe stale subscription and re-subscribe with current key
                await sub.unsubscribe();
                sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: currentKeyBytes as unknown as BufferSource,
                });
              }
            }
          } catch (e) {
            console.warn('Subscription key migration error:', e);
            // The old subscription was already unsubscribed above, so it is dead
            // no matter why the re-subscribe failed. Null it out instead of
            // reporting a revoked subscription to the UI (and the server) as live.
            sub = null;
          }
        }

        // If user already granted permission but subscription isn't created yet, subscribe now
        if (!sub && Notification.permission === 'granted' && vapidPublicKey) {
          try {
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey as unknown as BufferSource,
            });
          } catch (e) {
            console.warn('Auto-subscribe error:', e);
          }
        }

        if (sub) {
          setIsSubscribed(true);
          // Auto-sync with backend database silently so already-granted users are always registered
          fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: sub.toJSON(),
              userAgent: navigator.userAgent,
            }),
          }).catch((err) => console.warn('Silent subscription sync failed:', err));
        } else {
          setIsSubscribed(false);
        }
      })
      .catch((err) => console.warn('Could not check push subscription status:', err));
  }, [vapidPublicKey]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      showToast('Notifications are not supported on this browser');
      return false;
    }

    if (!vapidPublicKey) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined');
      showToast('Push notifications not configured');
      return false;
    }

    setLoading(true);
    try {
      // 1. Request user permission
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);

      if (result !== 'granted') {
        if (result === 'denied') {
          showToast('Notifications blocked in browser settings');
        }
        setLoading(false);
        return false;
      }

      // 2. Wait for Service Worker
      const reg = await getReadyRegistration();

      // 3. Subscribe with PushManager
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        });
      }

      // 4. Send subscription to Satya API
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      showToast('✓ Subscribed to critical civic alerts');
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Error subscribing to push notifications:', err);
      showToast(`Subscription error: ${err.message || 'Please try again'}`);
      setLoading(false);
      return false;
    }
  }, [isSupported, vapidPublicKey, showToast]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setLoading(true);
    try {
      const reg = await getReadyRegistration();
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }

      setIsSubscribed(false);
      showToast('Notifications turned off');
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Error unsubscribing:', err);
      showToast('Failed to turn off notifications');
      setLoading(false);
      return false;
    }
  }, [isSupported, showToast]);

  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      return await unsubscribe();
    } else {
      return await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    toggleSubscription,
  };
}
