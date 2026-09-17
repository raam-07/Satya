'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/lib/usePushNotifications';

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

export default function AdminNotifyPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [vapidReady, setVapidReady] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [tag, setTag] = useState('satya-alert');
  const [broadcasting, setBroadcasting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [failureList, setFailureList] = useState<Array<{ id?: number; error: string; statusCode?: number }>>([]);

  const { isSubscribed, subscribe } = usePushNotifications();

  // Check saved admin key in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('satya_admin_key');
    if (saved) {
      setAdminKey(saved);
      checkAuth(saved);
    }
  }, []);

  const checkAuth = async (key: string) => {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/notifications/status?key=${encodeURIComponent(key)}`);
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(true);
        setSubscriberCount(data.subscriberCount);
        setRecentLogs(data.recentLogs || []);
        setVapidReady(data.vapidConfigured);
        sessionStorage.setItem('satya_admin_key', key);
      } else {
        setAuthenticated(false);
        const errData = await res.json().catch(() => ({}));
        setResultMessage(`Authentication failed: ${errData.error || 'Invalid admin key.'}`);
        setIsError(true);
      }
    } catch (err: any) {
      setAuthenticated(false);
      setResultMessage(`Connection error: ${err.message || 'Failed to connect to notification status service.'}`);
      setIsError(true);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    checkAuth(adminKey.trim());
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!confirm(`Broadcast this alert to all ${subscriberCount || 0} active subscribers?`)) {
      return;
    }

    setBroadcasting(true);
    setResultMessage(null);
    setFailureList([]);
    setIsError(false);

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim(),
          tag,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const hasFailures = (data.failed && data.failed > 0) || (data.failures && data.failures.length > 0);
        setResultMessage(
          `Broadcast finished: Delivered: ${data.sent || 0}, Failed: ${data.failed || 0}, Purged: ${data.purged || 0} (Total: ${data.total || 0})`
        );
        setIsError(hasFailures);
        if (data.failures && data.failures.length > 0) {
          setFailureList(data.failures);
        } else {
          setFailureList([]);
        }

        if (!hasFailures) {
          setTitle('');
          setBody('');
          setUrl('/');
        }
        // Refresh status logs and subscriber count
        checkAuth(adminKey);
      } else {
        setResultMessage(`Server Error: ${data.error || 'Broadcast failed'}`);
        setIsError(true);
        if (data.failures) {
          setFailureList(data.failures);
        }
      }
    } catch (err: any) {
      setResultMessage(`Network/Broadcast error: ${err.message}`);
      setIsError(true);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleTestToMe = async () => {
    if (!isSubscribed) {
      const ok = await subscribe();
      if (!ok) {
        alert('Please allow notifications in your browser first to test.');
        return;
      }
    }

    setBroadcasting(true);
    setResultMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) throw new Error('No local subscription found');

      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          title: title.trim() || 'SatyaDheesh Test Alert',
          body: body.trim() || 'This is a live test notification from SatyaDheesh.',
          url: url.trim() || '/',
          testSubscription: sub.toJSON(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResultMessage('✓ Test notification delivered to this browser!');
        setIsError(false);
      } else {
        setResultMessage(`Error: ${data.error}`);
        setIsError(true);
      }
    } catch (err: any) {
      setResultMessage(`Test error: ${err.message}`);
      setIsError(true);
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text1)] p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-[var(--accent)]">
              Internal Admin
            </span>
            <h1 className="font-serif font-black text-2xl sm:text-3xl text-[var(--text1)] mt-0.5">
              Push Notification Broadcast Center
            </h1>
            <p className="text-xs font-mono text-[var(--text3)] mt-1">
              Deliver critical breaking news directly to subscribed citizens
            </p>
          </div>
          {authenticated && (
            <button
              onClick={() => {
                sessionStorage.removeItem('satya_admin_key');
                setAuthenticated(false);
                setAdminKey('');
              }}
              className="text-xs font-mono text-[var(--text3)] hover:text-[var(--text1)] underline"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {!authenticated ? (
        /* Login Card */
        <div className="bg-white border rounded-lg p-6 max-w-md mx-auto shadow-sm" style={{ borderColor: 'var(--border-md)' }}>
          <h2 className="font-serif font-bold text-lg mb-2">Admin Authentication</h2>
          <p className="text-xs text-[var(--text2)] mb-4">
            Enter your <code className="bg-[var(--bg-alt)] px-1.5 py-0.5 rounded font-mono">ADMIN_NOTIFY_KEY</code> to access broadcast controls.
          </p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <input
                type="password"
                placeholder="Enter secret key..."
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded font-mono bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style={{ borderColor: 'var(--border-md)' }}
              />
            </div>
            {resultMessage && (
              <p className={`text-xs font-mono ${isError ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
                {resultMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={loadingStats}
              className="w-full py-2 px-4 rounded text-xs font-mono font-semibold tracking-wider uppercase text-white transition-opacity hover:opacity-95 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {loadingStats ? 'Verifying...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      ) : (
        /* Dashboard */
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border p-4 rounded-lg shadow-sm" style={{ borderColor: 'var(--border-md)' }}>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
                Active Subscribers
              </span>
              <div className="text-2xl font-serif font-black text-[var(--text1)] mt-1">
                {subscriberCount !== null ? subscriberCount.toLocaleString() : '...'}
              </div>
              <span className="text-[10px] font-mono text-[var(--green)]">● Ready for broadcast</span>
            </div>

            <div className="bg-white border p-4 rounded-lg shadow-sm" style={{ borderColor: 'var(--border-md)' }}>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
                VAPID Engine
              </span>
              <div className="text-2xl font-serif font-black text-[var(--text1)] mt-1">
                {vapidReady ? 'Configured' : 'Missing Keys'}
              </div>
              <span className="text-[10px] font-mono text-[var(--text3)]">Standard W3C Web Push</span>
            </div>

            <div className="bg-white border p-4 rounded-lg shadow-sm" style={{ borderColor: 'var(--border-md)' }}>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
                Local Device Status
              </span>
              <div className="text-2xl font-serif font-black text-[var(--text1)] mt-1">
                {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
              </div>
              <span className="text-[10px] font-mono text-[var(--text3)]">For real-time testing</span>
            </div>
          </div>

          {/* Broadcast Form */}
          <div className="bg-white border rounded-lg p-5 sm:p-6 shadow-sm" style={{ borderColor: 'var(--border-md)' }}>
            <div className="border-b pb-3 mb-4" style={{ borderColor: 'var(--border-md)' }}>
              <h2 className="font-serif font-bold text-lg text-[var(--text1)]">Compose Broadcast Alert</h2>
              <p className="text-xs text-[var(--text3)] font-mono">
                Notifications wake user devices and display natively in the OS notification center.
              </p>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold tracking-wider uppercase mb-1 text-[var(--text2)]">
                  Notification Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Breaking: Supreme Court Orders Immediate Probe into Infrastructure Failure"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-serif"
                  style={{ borderColor: 'var(--border-md)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold tracking-wider uppercase mb-1 text-[var(--text2)]">
                  Summary / Body Text
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. An independent panel has been mandated to submit findings within 14 days following widespread public petitions."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] leading-relaxed"
                  style={{ borderColor: 'var(--border-md)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold tracking-wider uppercase mb-1 text-[var(--text2)]">
                    Target Article URL or Path
                  </label>
                  <input
                    type="text"
                    placeholder="/ or /topic/governance or article link"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded font-mono bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    style={{ borderColor: 'var(--border-md)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold tracking-wider uppercase mb-1 text-[var(--text2)]">
                    Alert Category / Tag
                  </label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded font-mono bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    style={{ borderColor: 'var(--border-md)' }}
                  >
                    <option value="satya-alert">Civic Alert (satya-alert)</option>
                    <option value="breaking-news">Breaking News (breaking-news)</option>
                    <option value="investigation">Investigative Report (investigation)</option>
                    <option value="promise-tracker">Promise Verdict (promise-tracker)</option>
                  </select>
                </div>
              </div>

              {resultMessage && (
                <div
                  className={`p-3.5 rounded text-xs font-mono ${
                    isError ? 'bg-red-50 text-[var(--red)] border border-red-200' : 'bg-green-50 text-[var(--green)] border border-green-200'
                  }`}
                >
                  <div className="font-semibold">{resultMessage}</div>
                  {failureList.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-red-200 space-y-2">
                      <div className="font-bold uppercase tracking-wider text-[10px] text-[var(--red)]">
                        Delivery Failure Diagnostics ({failureList.length}):
                      </div>
                      {failureList.map((f, idx) => (
                        <div key={idx} className="bg-white/90 p-2.5 rounded border border-red-200 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[var(--text2)]">
                            <span className="font-semibold">{f.id ? `Subscriber #${f.id}` : 'Target Device'}</span>
                            {f.statusCode && (
                              <span className="bg-red-100 px-1.5 py-0.5 rounded font-bold text-red-800">
                                HTTP {f.statusCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[var(--red)] break-words font-sans text-xs">{f.error}</div>
                          {f.statusCode === 403 && (
                            <div className="text-[10.5px] text-[var(--text2)] bg-amber-50 p-1.5 rounded border border-amber-200">
                              ℹ <strong>Key Mismatch:</strong> Token was created with an older VAPID key. It was automatically purged and will re-register on device refresh.
                            </div>
                          )}
                          {(f.statusCode === 404 || f.statusCode === 410) && (
                            <div className="text-[10.5px] text-[var(--text2)] bg-gray-50 p-1.5 rounded border border-gray-200">
                              ℹ <strong>Expired / Revoked:</strong> Subscription was unregistered by user or expired by push service. Cleaned from database.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={broadcasting || !title.trim()}
                  className="px-5 py-2.5 rounded text-xs font-mono font-semibold tracking-wider uppercase text-white transition-opacity hover:opacity-90 disabled:opacity-50 shadow-sm"
                  style={{ background: 'var(--accent)' }}
                >
                  {broadcasting ? 'Broadcasting...' : `Broadcast to ${subscriberCount || 0} Subscribers`}
                </button>

                <button
                  type="button"
                  onClick={handleTestToMe}
                  disabled={broadcasting}
                  className="px-4 py-2.5 rounded text-xs font-mono font-semibold tracking-wider uppercase border hover:bg-[var(--bg-alt)] transition-colors"
                  style={{ borderColor: 'var(--border-md)' }}
                >
                  Send Test To My Device
                </button>
              </div>
            </form>
          </div>

          {/* Recent Broadcast History */}
          <div className="bg-white border rounded-lg p-5 shadow-sm" style={{ borderColor: 'var(--border-md)' }}>
            <h3 className="font-serif font-bold text-base mb-3 text-[var(--text1)]">Recent Notification Logs</h3>
            {recentLogs.length === 0 ? (
              <p className="text-xs font-mono text-[var(--text3)] py-4 text-center">
                No notification broadcasts recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b text-[var(--text3)]" style={{ borderColor: 'var(--border-md)' }}>
                      <th className="py-2">Time</th>
                      <th className="py-2">Headline</th>
                      <th className="py-2 text-right">Sent</th>
                      <th className="py-2 text-right">Failed</th>
                      <th className="py-2 text-right">Purged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--bg)]">
                        <td className="py-2.5 text-[var(--text3)] whitespace-nowrap">
                          {new Date(log.created_at * 1000).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 font-sans font-medium text-[var(--text1)]">
                          <div>{log.title}</div>
                          {log.body && <div className="text-[11px] text-[var(--text2)] line-clamp-1">{log.body}</div>}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-[var(--green)]">{log.sent_count}</td>
                        <td className="py-2.5 text-right text-[var(--red)]">{log.failed_count}</td>
                        <td className="py-2.5 text-right text-[var(--text3)]">{log.purged_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
