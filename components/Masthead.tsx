'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BackButton } from './BackButton'

const TAB_PATHS = ['/', '/netas', '/vaade', '/data']

export function Masthead() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const isDetailPage = !TAB_PATHS.includes(pathname)

  useEffect(() => {
    setMounted(true)
  }, [])

  const today = mounted
    ? new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '\u00a0'

  // Issue number: +1 each day since establishment (1 Nov 2025 = Issue 1)
  const EST_DATE = new Date(2025, 10, 1) // 1 Nov 2025
  const issueNo = mounted
    ? Math.max(1, Math.floor((Date.now() - EST_DATE.getTime()) / 86_400_000) + 1)
    : null

  return (
    <div className="bg-white border-b" style={{ borderColor: 'var(--border-md)' }}>
      {/* Top accent stripe */}
      <div className="h-[2px]" style={{ background: 'var(--accent)' }} />

      {/* Edition line */}
      <div className="flex justify-between items-center px-4 pt-1.5">
        <span className="text-[8.5px] font-mono tracking-widest text-[var(--text3)]">VOL. I · EST. 11.2025</span>
        <span className="text-[8.5px] font-mono tracking-widest text-[var(--text3)]">{issueNo ? `ISSUE No. ${issueNo}` : ' '}</span>
      </div>

      {/* Logo */}
      <div className="text-center px-4 py-2">
        <div className="font-display font-black text-[32px] tracking-[0.22em] uppercase text-[var(--text1)] leading-none">
          SatyaDheesh
        </div>
        <div className="font-display font-bold text-[14px] leading-none mt-1" style={{ color: 'var(--accent)' }}>
          सत्याधीश
        </div>
        <div className="text-[7.5px] font-mono tracking-[0.24em] text-[var(--text3)] uppercase mt-1.5">
          India's Ground Truth Record
        </div>
      </div>

      {/* Hairline */}
      <div className="mx-4 h-px" style={{ background: 'var(--border-md)' }} />

      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        {isDetailPage ? (
          <div className="flex-1"><BackButton /></div>
        ) : (
          <span className="text-[9.5px] font-mono text-[var(--text2)] flex-1 truncate">{today}</span>
        )}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-[5px] h-[5px] rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 4px #1b7050' }} />
          <span className="text-[9px] font-mono font-semibold tracking-widest" style={{ color: 'var(--green)' }}>LIVE</span>
        </div>
      </div>
    </div>
  )
}
