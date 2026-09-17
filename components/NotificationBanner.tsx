'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/lib/usePushNotifications';

export function NotificationBanner() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only check localStorage on client
    if (typeof window === 'undefined') return;

    const storedDismissed = localStorage.getItem('satya_notif_dismissed');
    if (storedDismissed) {
      const timestamp = parseInt(storedDismissed, 10);
      // Re-surface after 14 days if user previously dismissed
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp < fourteenDaysMs) {
        setDismissed(true);
        return;
      }
    }

    // Wait 2.5 seconds after page load before showing the prompt
    const timer = setTimeout(() => {
      setDismissed(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Do not show if unsupported, already subscribed, already decided (granted/denied), or dismissed
  if (!isSupported || isSubscribed || permission !== 'default' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('satya_notif_dismissed', Date.now().toString());
    } catch {}
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <div
      role="region"
      aria-label="Notification subscription banner"
      className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-[#FFFFFF] border rounded-lg shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{ borderColor: 'var(--border-md)' }}
    >
      {/* Top editorial accent bar */}
      <div className="h-[3px]" style={{ background: 'var(--accent)' }} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Bell Icon with pulse ring */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'var(--bg-alt)', color: 'var(--accent)' }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-[var(--accent)]">
                Civic Dispatches
              </span>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss notification prompt"
                className="text-[var(--text3)] hover:text-[var(--text1)] p-0.5 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <h2 className="font-serif font-bold text-sm text-[var(--text1)] mt-1 leading-snug">
              Urgent Public Interest Alerts
            </h2>

            <p className="text-[11.5px] leading-relaxed text-[var(--text2)] mt-1">
              Receive notifications for critical investigative reports, high-priority governance alerts, and breaking constitutional developments. Zero marketing spam.
            </p>

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="px-3.5 py-1.5 rounded text-[11px] font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                style={{ background: 'var(--text1)' }}
              >
                {loading ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Enable Alerts</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className="text-[11px] text-[var(--text3)] hover:text-[var(--text2)] font-mono tracking-tight transition-colors py-1"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
