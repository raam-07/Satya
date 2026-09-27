'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'satya_upsc_strip_hidden_until'
const HIDE_DAYS = 7

/** Slim home-feed strip pointing aspirants to /upsc. Hidden until there are notes, and for 7 days after dismissal. */
export function UpscStrip() {
  const [counts, setCounts] = useState<{ today: number; week: number } | null>(null)

  useEffect(() => {
    try {
      if (Number(localStorage.getItem(KEY) || 0) > Date.now()) return
    } catch { /* storage blocked: just show it */ }
    let live = true
    fetch('/api/upsc')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d) setCounts({ today: Number(d.today) || 0, week: Number(d.week) || 0 }) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  if (!counts || (counts.today === 0 && counts.week === 0)) return null

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now() + HIDE_DAYS * 86400000)) } catch {}
    setCounts(null)
  }
  const n = counts.today > 0 ? counts.today : counts.week
  const when = counts.today > 0 ? 'today' : 'this week'

  return (
    <div className="flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
      <Link
        href="/upsc"
        className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5 text-[12.5px] transition-colors hover:bg-[var(--bg-alt)]"
      >
        {/* live dot: pings only when there are notes from today; reduced-motion users get a static dot */}
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          {counts.today > 0 && (
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping" style={{ background: 'var(--accent)' }} />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
        </span>
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--accent)' }}>
          For UPSC aspirants
        </span>
        <span className="truncate" style={{ color: 'var(--text1)' }}>
          {n} exam-relevant {n === 1 ? 'story' : 'stories'} {when}, GS-wise <span style={{ color: 'var(--accent)' }}>→</span>
        </span>
      </Link>
      <button
        onClick={dismiss}
        aria-label="Hide for a week"
        className="shrink-0 px-4 py-2.5 text-[14px] leading-none"
        style={{ color: 'var(--text3)' }}
      >
        ×
      </button>
    </div>
  )
}
