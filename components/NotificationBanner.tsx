'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/lib/usePushNotifications';

const DISMISS_KEY = 'satya_notif_dismissed';
const DISMISS_COUNT_KEY = 'satya_notif_dismiss_count';

const DAY = 24 * 60 * 60 * 1000;
const FIRST_COOLDOWN = 14 * DAY;   // asked once, said no → wait a fortnight
const FINAL_COOLDOWN = 120 * DAY;  // said no twice → stop pestering

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / storage blocked — non-fatal */
  }
}

export function NotificationBanner() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissedAt = safeGet(DISMISS_KEY);
    if (dismissedAt) {
      const when = parseInt(dismissedAt, 10);
      const count = parseInt(safeGet(DISMISS_COUNT_KEY) || '1', 10);
      const cooldown = count >= 2 ? FINAL_COOLDOWN : FIRST_COOLDOWN;
      if (Number.isFinite(when) && Date.now() - when < cooldown) return;
    }

    // Let the reader actually start reading before asking for anything.
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setEntered(true));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  if (!isSupported || isSubscribed || permission !== 'default' || !visible) {
    return null;
  }

  const close = () => {
    setEntered(false);
    setTimeout(() => setVisible(false), 220);
  };

  const handleDismiss = () => {
    const count = parseInt(safeGet(DISMISS_COUNT_KEY) || '0', 10) + 1;
    safeSet(DISMISS_KEY, Date.now().toString());
    safeSet(DISMISS_COUNT_KEY, String(count));
    close();
  };

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) close();
  };

  return (
    <div
      role="region"
      aria-label="Enable civic dispatch alerts"
      className="fixed z-50 bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[370px]"
      style={{
        transform: entered ? 'translateY(0)' : 'translateY(14px)',
        opacity: entered ? 1 : 0,
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
      }}
    >
      <div
        className="overflow-hidden border shadow-[0_18px_44px_-12px_rgba(26,26,26,0.35)]"
        style={{ background: 'var(--surface)', borderColor: 'var(--border-md)' }}
      >
        {/* Masthead accent stripe */}
        <div className="h-[3px]" style={{ background: 'var(--accent)' }} />

        {/* Edition strip — mirrors the site masthead */}
        <div
          className="flex items-center justify-between px-3.5 pt-2 pb-1.5 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-[8.5px] font-mono tracking-[0.22em] uppercase text-[var(--text3)]">
            Dispatch Service
          </span>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="-mr-1 p-1 text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3.5 pt-3 pb-3.5">
          <div className="flex gap-3">
            {/* Gavel mark */}
            <div
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center border"
              style={{ borderColor: 'var(--border-md)', background: 'var(--bg-alt)' }}
            >
              <svg
                className="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.5 3.5l7 7" />
                <path d="M16.5 2l5.5 5.5-3 3L13.5 5z" />
                <path d="M11.5 7l5.5 5.5-7.5 7.5-5.5-5.5z" />
                <path d="M2 22h9" />
              </svg>
            </div>

            <div className="min-w-0">
              <h2 className="font-display font-black text-[15px] leading-[1.15] text-[var(--text1)] tracking-tight">
                Get the verdict first.
              </h2>
              <div className="font-display font-bold text-[10.5px] mt-0.5" style={{ color: 'var(--accent)' }}>
                सत्याधीश अलर्ट
              </div>
            </div>
          </div>

          <p className="text-[11.5px] leading-[1.55] text-[var(--text2)] mt-3">
            We only interrupt you when a promise is marked kept or broken, or when a
            major governance story breaks. That is the whole list.
          </p>

          {/* What you actually get — editorial rule list */}
          <div className="mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            {[
              ['01', 'Promise verdicts as they change'],
              ['02', 'Breaking governance developments'],
              ['03', 'Nothing else. No marketing.'],
            ].map(([n, label]) => (
              <div
                key={n}
                className="flex items-baseline gap-2.5 py-1.5 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-[8.5px] font-mono tracking-widest text-[var(--text3)]">{n}</span>
                <span className="text-[11px] text-[var(--text2)] leading-snug">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3.5">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 h-9 text-[10.5px] font-mono font-semibold tracking-[0.14em] uppercase text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Connecting
                </>
              ) : (
                'Enable Alerts'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="h-9 px-3.5 text-[10.5px] font-mono tracking-[0.1em] uppercase text-[var(--text3)] hover:text-[var(--text1)] border transition-colors"
              style={{ borderColor: 'var(--border-md)' }}
            >
              Not now
            </button>
          </div>

          <p className="text-[9px] font-mono tracking-wide text-[var(--text3)] mt-2.5 text-center">
            Turn off anytime from the bell in the masthead
          </p>
        </div>
      </div>
    </div>
  );
}
