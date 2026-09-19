'use client';

import { useState, useEffect, useCallback } from 'react';
import { getReadyRegistration } from '@/lib/usePushNotifications';

interface Check {
  label: string;
  value: string;
  state: 'ok' | 'warn' | 'bad' | 'idle';
  hint?: string;
}

interface PushReceipt {
  title: string;
  at: number;
}

const PUSH_SERVICES: Array<[RegExp, string]> = [
  [/fcm\.googleapis\.com|android\.googleapis\.com/, 'Google FCM (Chrome / Edge)'],
  [/updates\.push\.services\.mozilla\.com/, 'Mozilla (Firefox)'],
  [/web\.push\.apple\.com/, 'Apple (Safari / iOS)'],
  [/notify\.windows\.com/, 'Windows (WNS)'],
];

function describeEndpoint(endpoint: string): string {
  for (const [re, name] of PUSH_SERVICES) {
    if (re.test(endpoint)) return name;
  }
  try {
    return new URL(endpoint).host;
  } catch {
    return 'unknown';
  }
}

function detectEnv() {
  if (typeof navigator === 'undefined') return { os: 'unknown', browser: 'unknown', isMacChrome: false, isIOS: false, standalone: false };
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isMac = /Macintosh|Mac OS X/.test(ua) && !isIOS;
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome|CriOS/.test(ua) && !isEdge;
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isSafari = /Safari/.test(ua) && !isChrome && !isEdge;

  const os = isIOS ? 'iOS' : isMac ? 'macOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : 'Other';
  const browser = isEdge ? 'Edge' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Other';

  const standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator as any).standalone === true;

  return { os, browser, isMacChrome: isMac && (isChrome || isEdge), isIOS, standalone };
}

const dot = (state: Check['state']) => ({
  ok: 'var(--green)',
  warn: 'var(--amber)',
  bad: 'var(--red)',
  idle: 'var(--text3)',
}[state]);

export function PushDiagnostics() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [receipts, setReceipts] = useState<PushReceipt[]>([]);
  const [localResult, setLocalResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [env, setEnv] = useState(() => ({ os: '—', browser: '—', isMacChrome: false, isIOS: false, standalone: false }));

  const run = useCallback(async () => {
    const e = detectEnv();
    setEnv(e);
    const out: Check[] = [];

    out.push({ label: 'Environment', value: `${e.os} · ${e.browser}${e.standalone ? ' · installed' : ''}`, state: 'idle' });

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    out.push({
      label: 'Push supported',
      value: supported ? 'Yes' : 'No',
      state: supported ? 'ok' : 'bad',
      hint: !supported && e.isIOS && !e.standalone
        ? 'On iPhone/iPad, web push only works once the site is added to the Home Screen. Safari tabs cannot receive it.'
        : undefined,
    });

    if (!supported) {
      setChecks(out);
      return;
    }

    const perm = Notification.permission;
    out.push({
      label: 'Browser permission',
      value: perm,
      state: perm === 'granted' ? 'ok' : perm === 'denied' ? 'bad' : 'warn',
      hint: perm === 'denied' ? 'Blocked for this site. Reset it via the padlock icon in the address bar.' : undefined,
    });

    const reg = await navigator.serviceWorker.getRegistration();
    out.push({
      label: 'Service worker',
      value: reg ? (reg.active ? 'Active' : reg.installing ? 'Installing' : 'Waiting') : 'Not registered',
      state: reg?.active ? 'ok' : reg ? 'warn' : 'bad',
    });

    if (reg?.active) {
      const url = reg.active.scriptURL.split('/').pop() || '';
      out.push({ label: 'Worker script', value: url, state: 'idle' });
    }

    const sub = reg ? await reg.pushManager.getSubscription() : null;
    out.push({
      label: 'Push subscription',
      value: sub ? 'Present' : 'None',
      state: sub ? 'ok' : 'bad',
      hint: !sub && perm === 'granted' ? 'Permission is granted but no subscription exists — reload the site to let it re-subscribe.' : undefined,
    });

    if (sub) {
      out.push({ label: 'Delivered via', value: describeEndpoint(sub.endpoint), state: 'idle' });

      // Does this subscription still match the VAPID key the server signs with?
      try {
        const res = await fetch('/api/notifications/vapid-key');
        const { publicKey } = await res.json();
        const existing = sub.options?.applicationServerKey;
        if (publicKey && existing) {
          const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
          const raw = atob((publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
          const want = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) want[i] = raw.charCodeAt(i);
          const have = new Uint8Array(existing);
          const match = want.length === have.length && want.every((b, i) => b === have[i]);
          out.push({
            label: 'VAPID key',
            value: match ? 'Matches server' : 'Stale — rotated',
            state: match ? 'ok' : 'warn',
            hint: match ? undefined : 'This device subscribed under an older key. Reload the site and it will re-subscribe automatically.',
          });
        }
      } catch {
        /* non-fatal */
      }
    }

    setChecks(out);
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  // Listen for the service worker reporting that a push actually arrived.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'satya-push-received') {
        setReceipts((prev) => [{ title: event.data.title, at: event.data.at }, ...prev].slice(0, 5));
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const showLocal = async () => {
    setBusy(true);
    setLocalResult(null);
    try {
      if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') {
          setLocalResult({ ok: false, text: 'Permission not granted, so nothing can be shown.' });
          setBusy(false);
          return;
        }
      }
      const reg = await getReadyRegistration();
      await reg.showNotification('SatyaDheesh · local test', {
        body: 'If you can see this, your browser and OS can display notifications.',
        icon: '/favicons/gavel-192.png',
        badge: '/favicons/gavel-32.png',
        tag: 'satya-local-test',
      });
      setLocalResult({
        ok: true,
        text: 'Asked the browser to display a notification. If nothing appeared on screen, the browser is being muted by your operating system — not by this app.',
      });
    } catch (err: any) {
      setLocalResult({ ok: false, text: err?.message || 'The browser refused to display it.' });
    } finally {
      setBusy(false);
      run();
    }
  };

  const refreshWorker = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
      setLocalResult({ ok: true, text: 'Service worker update requested. Reload the page to activate the newest version.' });
    } catch (err: any) {
      setLocalResult({ ok: false, text: err?.message || 'Could not update the worker.' });
    } finally {
      setBusy(false);
      run();
    }
  };

  return (
    <div className="border bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h2 className="font-display font-bold text-[15px]">Delivery diagnostics</h2>
          <p className="text-[10.5px] font-mono text-[var(--text3)] mt-0.5">Why an alert did or did not appear on this device</p>
        </div>
        <button
          onClick={run}
          className="text-[9.5px] font-mono uppercase tracking-wider text-[var(--text3)] hover:text-[var(--text1)]"
        >
          Re-check
        </button>
      </div>

      <div className="p-5">
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {checks.map((c) => (
            <div key={c.label} className="py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot(c.state) }} />
                <span className="text-[11px] text-[var(--text2)] flex-1">{c.label}</span>
                <span className="text-[11px] font-mono text-[var(--text1)]">{c.value}</span>
              </div>
              {c.hint && <p className="text-[10.5px] leading-relaxed text-[var(--text3)] mt-1 ml-4">{c.hint}</p>}
            </div>
          ))}
        </div>

        {/* Pushes actually received by the service worker */}
        <div className="mt-4">
          <div className="text-[9px] font-mono tracking-[0.18em] uppercase text-[var(--text3)] mb-1.5">
            Pushes received while this page is open
          </div>
          {receipts.length === 0 ? (
            <p className="text-[10.5px] font-mono text-[var(--text3)]">
              None yet. Send a test below and watch this line — if it fills in but no notification appeared on screen,
              delivery is working and the operating system is suppressing the display.
            </p>
          ) : (
            <div className="space-y-1">
              {receipts.map((r, i) => (
                <div key={i} className="text-[10.5px] font-mono flex justify-between" style={{ color: 'var(--green)' }}>
                  <span className="truncate pr-3">{r.title}</span>
                  <span className="flex-shrink-0">{new Date(r.at).toLocaleTimeString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {localResult && (
          <div
            className="mt-4 p-3 text-[11px] leading-relaxed border"
            style={{
              borderColor: localResult.ok ? 'var(--green)' : 'var(--red)',
              background: localResult.ok ? 'rgba(27,112,80,0.06)' : 'rgba(176,40,40,0.05)',
              color: localResult.ok ? 'var(--green)' : 'var(--red)',
            }}
          >
            {localResult.text}
          </div>
        )}

        {/* Platform-specific gotchas worth knowing before blaming the code */}
        {env.isMacChrome && (
          <div className="mt-4 p-3 border text-[11px] leading-relaxed" style={{ borderColor: 'var(--amber)', background: 'rgba(146,64,14,0.05)', color: 'var(--amber)' }}>
            <strong className="font-mono text-[9.5px] tracking-wider uppercase block mb-1">macOS note</strong>
            macOS gates browser notifications separately from the browser&apos;s own permission. Open
            System&nbsp;Settings → Notifications → {env.browser} and make sure &ldquo;Allow notifications&rdquo; is on and the
            alert style is Banners or Alerts, not None. Also check that a Focus mode is not active — Focus
            silently withholds notifications with no error anywhere.
          </div>
        )}

        {env.isIOS && (
          <div className="mt-4 p-3 border text-[11px] leading-relaxed" style={{ borderColor: 'var(--amber)', background: 'rgba(146,64,14,0.05)', color: 'var(--amber)' }}>
            <strong className="font-mono text-[9.5px] tracking-wider uppercase block mb-1">iOS note</strong>
            iOS only delivers web push to sites added to the Home Screen, and it ignores hero images, action
            buttons and the stay-on-screen flag. Alerts there will always look plainer than on Android.
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 mt-4">
          <button
            onClick={showLocal}
            disabled={busy}
            className="h-9 px-4 text-[10px] font-mono font-semibold tracking-[0.14em] uppercase text-white disabled:opacity-40"
            style={{ background: 'var(--text1)' }}
          >
            Show notification locally
          </button>
          <button
            onClick={refreshWorker}
            disabled={busy}
            className="h-9 px-4 text-[10px] font-mono tracking-[0.12em] uppercase border disabled:opacity-40 hover:bg-[var(--bg-alt)] transition-colors"
            style={{ borderColor: 'var(--border-md)' }}
          >
            Update service worker
          </button>
        </div>
        <p className="text-[10px] font-mono text-[var(--text3)] mt-2 leading-relaxed">
          &ldquo;Show locally&rdquo; skips the server and the push network entirely. If that one does not appear,
          nothing sent from here ever will, and the fault is in the OS or browser settings.
        </p>
      </div>
    </div>
  );
}
