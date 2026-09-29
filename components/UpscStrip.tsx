'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import type { Language } from '@/lib/i18n'

interface UpscStripProps {
  currentLang?: Language
}

/**
 * Slim home-feed strip pointing aspirants to /upsc.
 * Always renders on SSR and client so the UPSC visiting link is never hidden.
 */
export function UpscStrip({ currentLang: propLang }: UpscStripProps = {}) {
  const { currentLang: contextLang } = useLanguage()
  const lang = contextLang || propLang || 'en'
  const isHi = lang === 'hi'

  const [counts, setCounts] = useState<{ today: number; week: number } | null>(null)

  useEffect(() => {
    // Clear any stale legacy dismissal lockout so visitors always see the link
    try {
      localStorage.removeItem('satya_upsc_strip_hidden_until')
    } catch {}

    let live = true
    fetch('/api/upsc')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (live && d) {
          setCounts({ today: Number(d.today) || 0, week: Number(d.week) || 0 })
        }
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const hasToday = (counts?.today ?? 0) > 0
  const n = hasToday ? counts!.today : (counts?.week ?? 0)
  const when = hasToday ? (isHi ? 'आज' : 'today') : (isHi ? 'इस सप्ताह' : 'this week')

  return (
    <div
      className="flex items-center border-b bg-[var(--surface)] transition-colors hover:bg-[var(--surface-alt)]"
      style={{ borderColor: 'var(--border)' }}
    >
      <Link
        href="/upsc"
        className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 text-[12.5px] transition-colors"
      >
        {/* Pulsing live dot when today's notes are available */}
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          {hasToday && (
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping"
              style={{ background: 'var(--accent)' }}
            />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
        </span>

        {/* Brand Accent Pill */}
        <span
          className="font-mono text-[9.5px] font-bold uppercase tracking-widest shrink-0 px-1.5 py-0.5 rounded-xs"
          style={{
            color: 'var(--accent)',
            background: 'rgba(191, 74, 7, 0.08)',
            border: '1px solid rgba(191, 74, 7, 0.2)',
          }}
        >
          {isHi ? 'UPSC अभ्यर्थियों के लिए' : 'For UPSC aspirants'}
        </span>

        {/* Status Line with Navigation Arrow */}
        <span className="truncate text-[12px] font-medium" style={{ color: 'var(--text1)' }}>
          {n > 0 ? (
            isHi ? (
              <>
                {n} परीक्षा-उपयोगी विश्लेषण ({when}), GS-वार <span style={{ color: 'var(--accent)' }}>→</span>
              </>
            ) : (
              <>
                {n} exam-relevant {n === 1 ? 'story' : 'stories'} {when}, GS-wise <span style={{ color: 'var(--accent)' }}>→</span>
              </>
            )
          ) : (
            isHi ? (
              <>
                जीएस पाठ्यक्रम आधारित समसामयिकी व नोट्स <span style={{ color: 'var(--accent)' }}>→</span>
              </>
            ) : (
              <>
                Exam-relevant current affairs, GS1–GS4 syllabus notes <span style={{ color: 'var(--accent)' }}>→</span>
              </>
            )
          )}
        </span>
      </Link>
    </div>
  )
}
