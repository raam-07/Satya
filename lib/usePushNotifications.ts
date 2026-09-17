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

    // Check if there is already an active push subscription
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(Boolean(sub));
      })
      .catch((err) => console.warn('Could not check push subscription status:', err));
  }, []);

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
      const reg = await navigator.serviceWorker.ready;

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
      const reg = await navigator.serviceWorker.ready;
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
