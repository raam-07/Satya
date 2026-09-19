'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePushNotifications, getReadyRegistration } from '@/lib/usePushNotifications';
import { PushDiagnostics } from '@/components/PushDiagnostics';

interface NotificationLog {
  id: number;
  title: string;
  body: string;
  url: string;
  sent_count: number;
  failed_count: number;
  purged_count: number;
  created_at: number;
}

interface Breakdown {
  name: string;
  value: number;
}

interface StatusData {
  subscriberCount: number;
  activeCount: number;
  staleCount: number;
  activeWindowDays: number;
  platforms: Breakdown[];
  browsers: Breakdown[];
  recentLogs: NotificationLog[];
  vapidConfigured: boolean;
  vapidSubject: string | null;
}

interface SendResult {
  ok: boolean;
  message: string;
  warning?: string;
  failures?: Array<{ id?: number; error: string; statusCode?: number }>;
}

// Roughly how much survives on a real lock screen before the OS truncates.
const TITLE_SAFE = 45;
const BODY_SAFE = 120;
const TITLE_MAX = 120;
const BODY_MAX = 350;

const TAGS = [
  { value: 'satya-alert', label: 'Civic Alert' },
  { value: 'breaking-news', label: 'Breaking News' },
  { value: 'investigation', label: 'Investigative Report' },
  { value: 'promise-tracker', label: 'Promise Verdict' },
];

const label = 'block text-[9px] font-mono font-semibold tracking-[0.18em] uppercase mb-1.5 text-[var(--text3)]';
const input =
  'w-full px-3 py-2 text-[13px] border bg-[var(--bg)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const card = 'border bg-[var(--surface)]';

function Counter({ value, safe, max }: { value: number; safe: number; max: number }) {
  const over = value > safe;
  const critical = value > max;
  return (
    <span
      className="text-[9px] font-mono tracking-wider"
      style={{ color: critical ? 'var(--red)' : over ? 'var(--amber)' : 'var(--text3)' }}
    >
      {value}/{max}
      {critical ? ' · TOO LONG' : over ? ` · CUT OFF AFTER ${safe} ON PHONES` : ''}
    </span>
  );
}

export default function AdminNotifyPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [tag, setTag] = useState('satya-alert');
  const [image, setImage] = useState('');
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [withActions, setWithActions] = useState(true);

  const [device, setDevice] = useState<'android' | 'ios' | 'desktop'>('android');

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { isSubscribed, subscribe } = usePushNotifications();

  const loadStatus = useCallback(async (key: string) => {
    setLoadingStats(true);
    setAuthError(null);
    try {
      // Key travels in the Authorization header, never the query string.
      const res = await fetch('/api/notifications/status?logs=25', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setAuthenticated(true);
        try {
          sessionStorage.setItem('satya_admin_key', key);
        } catch {}
      } else {
        const err = await res.json().catch(() => ({}));
        setAuthenticated(false);
        setAuthError(err.error || 'Invalid admin key.');
      }
    } catch (err: any) {
      setAuthenticated(false);
      setAuthError(err.message || 'Could not reach the notification service.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('satya_admin_key');
      if (saved) {
        setAdminKey(saved);
        loadStatus(saved);
      }
    } catch {}
  }, [loadStatus]);

  const payload = () => ({
    title: title.trim(),
    body: body.trim(),
    url: url.trim() || '/',
    tag,
    image: image.trim() || undefined,
    requireInteraction,
    actions: withActions
      ? [
          { action: 'open', title: 'Read full story' },
          { action: 'dismiss', title: 'Dismiss' },
        ]
      : undefined,
  });

  const broadcast = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({
          ok: !data.warning && !(data.failed > 0),
          message: `Delivered ${data.sent} · Failed ${data.failed} · Purged ${data.purged} · Total ${data.total}`,
          warning: data.warning,
          failures: data.failures,
        });
        if (!data.warning && !data.failed) {
          setTitle('');
          setBody('');
          setImage('');
          setUrl('/');
        }
        loadStatus(adminKey);
      } else {
        setResult({ ok: false, message: data.error || 'Broadcast failed', failures: data.failures });
      }
    } catch (err: any) {
      setResult({ ok: false, message: err.message || 'Network error during broadcast' });
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setResult(null);
    try {
      if (!isSubscribed) {
        const ok = await subscribe();
        if (!ok) {
          setResult({ ok: false, message: 'Allow notifications in this browser first, then retry the test.' });
          setBusy(false);
          return;
        }
      }
      const reg = await getReadyRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (!sub) throw new Error('No push subscription found on this device.');

      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          ...payload(),
          title: title.trim() || 'SatyaDheesh test alert',
          body: body.trim() || 'If you can see this, push delivery is working.',
          testSubscription: sub.toJSON(),
        }),
      });
      const data = await res.json();
      setResult(
        res.ok
          ? { ok: true, message: 'Test delivered to this device — check your notification tray.' }
          : { ok: false, message: data.error || 'Test failed', failures: data.detail ? [{ error: data.detail, statusCode: data.statusCode }] : undefined }
      );
    } catch (err: any) {
      setResult({ ok: false, message: err.message || 'Test failed' });
    } finally {
      setBusy(false);
    }
  };

  const loadFromLog = (log: NotificationLog) => {
    setTitle(log.title || '');
    setBody(log.body || '');
    setUrl(log.url || '/');
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const signOut = () => {
    try {
      sessionStorage.removeItem('satya_admin_key');
    } catch {}
    setAuthenticated(false);
    setAdminKey('');
    setStatus(null);
  };

  // ---------------------------------------------------------------- preview
  const previewTitle = title.trim() || 'Your headline appears here';
  const previewBody = body.trim() || 'The summary line shows up underneath.';
  const showActions = withActions && url.trim() !== '/' && url.trim() !== '';
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const Preview = () => {
    if (device === 'ios') {
      return (
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(160deg,#3f3b36,#1f1d1b)' }}>
          <div className="rounded-[18px] p-3 backdrop-blur" style={{ background: 'rgba(255,255,255,0.92)' }}>
            <div className="flex items-start gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicons/gavel-192.png" alt="" className="w-7 h-7 rounded-[7px] flex-shrink-0 object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[9px] font-semibold tracking-wide uppercase text-black/50">SatyaDheesh</span>
                  <span className="text-[9px] text-black/40">now</span>
                </div>
                <div className="text-[12.5px] font-semibold text-black leading-snug mt-0.5 break-words">{previewTitle}</div>
                <div className="text-[12px] text-black/70 leading-snug break-words">{previewBody}</div>
              </div>
            </div>
          </div>
          {(image.trim() || showActions || requireInteraction) && (
            <div className="mt-2.5 px-2.5 py-2 rounded-lg text-[10px] leading-relaxed" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)' }}>
              iOS drops{' '}
              {[image.trim() && 'the hero image', showActions && 'action buttons', requireInteraction && 'stay-on-screen'].filter(Boolean).join(', ')}
              {' '}— it shows title and text only, and only once the site is installed to the Home Screen.
            </div>
          )}
          <div className="text-center text-[8.5px] font-mono tracking-widest text-white/40 mt-2.5">iOS LOCK SCREEN</div>
        </div>
      );
    }

    if (device === 'desktop') {
      return (
        <div className="p-4 rounded-lg" style={{ background: '#2b2b2b' }}>
          <div className="rounded-lg overflow-hidden shadow-xl" style={{ background: '#ffffff' }}>
            <div className="p-3">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/favicons/gavel-192.png" alt="" className="w-10 h-10 rounded flex-shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-black leading-snug break-words">{previewTitle}</div>
                  <div className="text-[12px] text-black/70 leading-snug mt-0.5 break-words">{previewBody}</div>
                  <div className="text-[11px] text-black/40 mt-1.5">satyadheesh.in</div>
                </div>
              </div>
              {image.trim() && (
                <div className="mt-2.5 h-24 bg-black/5 rounded overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.trim()} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {showActions && (
                <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-black/10">
                  <span className="text-[11px] font-medium" style={{ color: '#1a73e8' }}>Read full story</span>
                  <span className="text-[11px] font-medium text-black/50">Dismiss</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-center text-[8.5px] font-mono tracking-widest text-white/40 mt-2.5">DESKTOP · CHROME</div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(160deg,#20242b,#12151a)' }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#f1f3f4' }}>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicons/gavel-192.png" alt="" className="w-4 h-4 rounded-full flex-shrink-0 object-cover" />
              <span className="text-[10px] text-black/60">SatyaDheesh</span>
              <span className="text-[10px] text-black/40">· now</span>
              {requireInteraction && (
                <span className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>
                  ONGOING
                </span>
              )}
            </div>
            <div className="text-[13px] font-semibold text-black leading-snug break-words">{previewTitle}</div>
            <div className="text-[12px] text-black/70 leading-snug mt-0.5 break-words">{previewBody}</div>
            {image.trim() && (
              <div className="mt-2.5 h-28 bg-black/5 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.trim()} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {showActions && (
              <div className="flex gap-4 mt-2.5 pt-2 border-t border-black/10">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Read full story</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-black/45">Dismiss</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-center text-[8.5px] font-mono tracking-widest text-white/40 mt-2.5">ANDROID · {now}</div>
      </div>
    );
  };

  // ------------------------------------------------------------------ login
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className={`${card} w-full max-w-sm`} style={{ borderColor: 'var(--border-md)' }}>
          <div className="h-[3px]" style={{ background: 'var(--accent)' }} />
          <div className="p-6">
            <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-[var(--text3)]">Internal</div>
            <h1 className="font-display font-black text-xl text-[var(--text1)] mt-1">Broadcast Centre</h1>
            <p className="text-[11.5px] text-[var(--text2)] mt-2 leading-relaxed">
              Enter <code className="font-mono text-[10.5px] px-1 py-0.5" style={{ background: 'var(--bg-alt)' }}>ADMIN_NOTIFY_KEY</code> to continue.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adminKey.trim()) loadStatus(adminKey.trim());
              }}
              className="mt-4 space-y-3"
            >
              <input
                type="password"
                autoFocus
                placeholder="Secret key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className={`${input} font-mono`}
                style={{ borderColor: 'var(--border-md)' }}
              />
              {authError && <p className="text-[11px] font-mono" style={{ color: 'var(--red)' }}>{authError}</p>}
              <button
                type="submit"
                disabled={loadingStats}
                className="w-full h-10 text-[10.5px] font-mono font-semibold tracking-[0.15em] uppercase text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {loadingStats ? 'Verifying…' : 'Enter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- dashboard
  const stat = (k: string, v: string | number, sub?: string, color?: string) => (
    <div className={`${card} p-3.5`} style={{ borderColor: 'var(--border-md)' }}>
      <div className="text-[9px] font-mono tracking-[0.18em] uppercase text-[var(--text3)]">{k}</div>
      <div className="font-display font-black text-xl mt-1" style={{ color: color || 'var(--text1)' }}>{v}</div>
      {sub && <div className="text-[9.5px] font-mono text-[var(--text3)] mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text1)]">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-end justify-between border-b pb-3 mb-5" style={{ borderColor: 'var(--border-md)' }}>
          <div>
            <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-[var(--accent)]">Internal · Dispatch</div>
            <h1 className="font-display font-black text-2xl sm:text-[28px] mt-0.5 tracking-tight">Broadcast Centre</h1>
          </div>
          <button onClick={signOut} className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] hover:text-[var(--text1)]">
            Sign out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {stat('Subscribers', status?.subscriberCount?.toLocaleString() ?? '—')}
          {stat(
            `Active (${status?.activeWindowDays ?? 60}d)`,
            status?.activeCount?.toLocaleString() ?? '—',
            status?.staleCount ? `${status.staleCount.toLocaleString()} dormant` : undefined,
            'var(--green)'
          )}
          {stat('VAPID', status?.vapidConfigured ? 'Ready' : 'Missing', status?.vapidSubject || undefined, status?.vapidConfigured ? undefined : 'var(--red)')}
          {stat('This device', isSubscribed ? 'Subscribed' : 'Not subscribed', 'for test sends')}
        </div>

        {/* Breakdown */}
        {status && (status.platforms.length > 0 || status.browsers.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {[
              { heading: 'Platforms', rows: status.platforms },
              { heading: 'Browsers', rows: status.browsers },
            ].map(({ heading, rows }) => {
              const total = rows.reduce((a, b) => a + b.value, 0) || 1;
              return (
                <div key={heading} className={`${card} p-4`} style={{ borderColor: 'var(--border-md)' }}>
                  <div className="text-[9px] font-mono tracking-[0.18em] uppercase text-[var(--text3)] mb-2.5">{heading}</div>
                  <div className="space-y-1.5">
                    {rows.slice(0, 5).map((r) => (
                      <div key={r.name} className="flex items-center gap-2">
                        <span className="text-[11px] w-16 flex-shrink-0 text-[var(--text2)]">{r.name}</span>
                        <div className="flex-1 h-[7px]" style={{ background: 'var(--bg-alt)' }}>
                          <div className="h-full" style={{ width: `${(r.value / total) * 100}%`, background: 'var(--accent)' }} />
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text3)] w-9 text-right">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* Compose */}
          <div className={card} style={{ borderColor: 'var(--border-md)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-display font-bold text-[15px]">Compose alert</h2>
              <p className="text-[10.5px] font-mono text-[var(--text3)] mt-0.5">This lands on real lock screens. There is no undo.</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className={label}>Headline *</label>
                  <Counter value={title.length} safe={TITLE_SAFE} max={TITLE_MAX} />
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Supreme Court orders probe into bridge collapse"
                  className={input}
                  style={{ borderColor: 'var(--border-md)' }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={label}>Summary</label>
                  <Counter value={body.length} safe={BODY_SAFE} max={BODY_MAX} />
                </div>
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="An independent panel must submit findings within 14 days."
                  className={`${input} leading-relaxed resize-y`}
                  style={{ borderColor: 'var(--border-md)' }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Destination</label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/vaade/some-promise"
                    className={`${input} font-mono text-[12px]`}
                    style={{ borderColor: 'var(--border-md)' }}
                  />
                </div>
                <div>
                  <label className={label}>Category</label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className={`${input} font-mono text-[12px]`}
                    style={{ borderColor: 'var(--border-md)' }}
                  >
                    {TAGS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>Hero image URL (optional)</label>
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://satyadheesh.in/…/cover.jpg"
                  className={`${input} font-mono text-[12px]`}
                  style={{ borderColor: 'var(--border-md)' }}
                />
                <p className="text-[9.5px] font-mono text-[var(--text3)] mt-1">Shown expanded on Android and desktop. Ignored on iOS.</p>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={withActions} onChange={(e) => setWithActions(e.target.checked)} className="accent-[var(--accent)]" />
                  <span className="text-[11px] text-[var(--text2)]">Action buttons</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={requireInteraction} onChange={(e) => setRequireInteraction(e.target.checked)} className="accent-[var(--accent)]" />
                  <span className="text-[11px] text-[var(--text2)]">Stays until dismissed (critical only)</span>
                </label>
              </div>

              {result && (
                <div
                  className="p-3.5 text-[11.5px] border"
                  style={{
                    borderColor: result.ok ? 'var(--green)' : 'var(--red)',
                    background: result.ok ? 'rgba(27,112,80,0.06)' : 'rgba(176,40,40,0.05)',
                  }}
                >
                  <div className="font-mono font-semibold" style={{ color: result.ok ? 'var(--green)' : 'var(--red)' }}>
                    {result.message}
                  </div>

                  {result.warning && (
                    <div className="mt-2.5 p-2.5 text-[11px] leading-relaxed border" style={{ borderColor: 'var(--amber)', background: 'rgba(146,64,14,0.06)', color: 'var(--amber)' }}>
                      <strong className="font-mono text-[10px] tracking-wider uppercase">Purge blocked · </strong>
                      {result.warning}
                    </div>
                  )}

                  {result.failures && result.failures.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {result.failures.slice(0, 8).map((f, i) => (
                        <div key={i} className="p-2 text-[10.5px] font-mono break-words" style={{ background: 'var(--bg-alt)' }}>
                          {f.id ? `#${f.id} ` : ''}{f.statusCode ? `HTTP ${f.statusCode} · ` : ''}{f.error}
                        </div>
                      ))}
                      {result.failures.length > 8 && (
                        <div className="text-[10px] font-mono text-[var(--text3)]">+{result.failures.length - 8} more</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy || !title.trim()}
                  className="h-10 px-5 text-[10.5px] font-mono font-semibold tracking-[0.15em] uppercase text-white disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  {busy ? 'Working…' : `Broadcast to ${status?.subscriberCount ?? 0}`}
                </button>
                <button
                  onClick={sendTest}
                  disabled={busy}
                  className="h-10 px-4 text-[10.5px] font-mono font-semibold tracking-[0.12em] uppercase border disabled:opacity-40 hover:bg-[var(--bg-alt)] transition-colors"
                  style={{ borderColor: 'var(--border-md)' }}
                >
                  Test on this device
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={`${card} lg:sticky lg:top-5`} style={{ borderColor: 'var(--border-md)' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-display font-bold text-[13px]">Preview</h2>
              <div className="flex gap-0.5">
                {(['android', 'ios', 'desktop'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors"
                    style={{
                      background: device === d ? 'var(--text1)' : 'transparent',
                      color: device === d ? '#fff' : 'var(--text3)',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              <Preview />
              <p className="text-[9.5px] font-mono text-[var(--text3)] mt-3 leading-relaxed">
                Approximate. Exact rendering varies by OS version and device settings.
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostics */}
        <div className="mt-5">
          <PushDiagnostics />
        </div>

        {/* History */}
        <div className={`${card} mt-5`} style={{ borderColor: 'var(--border-md)' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-display font-bold text-[15px]">Sent history</h2>
            <span className="text-[9.5px] font-mono text-[var(--text3)]">click a row to reload it</span>
          </div>
          {!status?.recentLogs?.length ? (
            <p className="text-[11.5px] font-mono text-[var(--text3)] text-center py-8">Nothing broadcast yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-mono uppercase tracking-[0.15em] text-[var(--text3)] border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="py-2 px-5 font-semibold">When</th>
                    <th className="py-2 font-semibold">Headline</th>
                    <th className="py-2 text-right font-semibold">Sent</th>
                    <th className="py-2 text-right font-semibold">Failed</th>
                    <th className="py-2 px-5 text-right font-semibold">Purged</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => loadFromLog(log)}
                      className="border-b cursor-pointer hover:bg-[var(--bg-alt)] transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="py-2.5 px-5 text-[10.5px] font-mono text-[var(--text3)] whitespace-nowrap align-top">
                        {new Date(log.created_at * 1000).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="text-[12.5px] font-medium leading-snug">{log.title}</div>
                        {log.body && <div className="text-[11px] text-[var(--text3)] line-clamp-1">{log.body}</div>}
                      </td>
                      <td className="py-2.5 text-right text-[11.5px] font-mono" style={{ color: 'var(--green)' }}>{log.sent_count}</td>
                      <td className="py-2.5 text-right text-[11.5px] font-mono" style={{ color: log.failed_count ? 'var(--red)' : 'var(--text3)' }}>{log.failed_count}</td>
                      <td className="py-2.5 px-5 text-right text-[11.5px] font-mono text-[var(--text3)]">{log.purged_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,26,26,0.55)' }}>
          <div className={`${card} w-full max-w-sm`} style={{ borderColor: 'var(--border-md)' }}>
            <div className="h-[3px]" style={{ background: 'var(--accent)' }} />
            <div className="p-5">
              <h3 className="font-display font-black text-lg">Send to {status?.subscriberCount ?? 0} people?</h3>
              <p className="text-[11.5px] text-[var(--text2)] mt-2 leading-relaxed">
                This appears on their lock screens immediately and cannot be recalled.
              </p>
              <div className="mt-3 p-3 text-[12px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)' }}>
                <div className="font-semibold leading-snug">{title.trim()}</div>
                {body.trim() && <div className="text-[11.5px] text-[var(--text2)] mt-0.5 leading-snug">{body.trim()}</div>}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={broadcast}
                  className="flex-1 h-10 text-[10.5px] font-mono font-semibold tracking-[0.15em] uppercase text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Send now
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="h-10 px-4 text-[10.5px] font-mono tracking-[0.12em] uppercase border text-[var(--text2)]"
                  style={{ borderColor: 'var(--border-md)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
