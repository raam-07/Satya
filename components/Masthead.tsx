'use client'
import { usePathname } from 'next/navigation'
import { BackButton } from './BackButton'
import { NotificationBell } from './NotificationBell'
import { LanguageSwitch } from './LanguageSwitch'
import { useLanguage } from '@/lib/LanguageContext'
import type { Language } from '@/lib/i18n'

const TAB_PATHS = ['/', '/netas', '/vaade', '/data']

export function Masthead({ currentLang: propLang }: { currentLang?: Language } = {}) {
  const { currentLang: contextLang } = useLanguage()
  const lang = contextLang || propLang || 'en'
  const isHi = lang === 'hi'

  const pathname = usePathname()
  const isDetailPage = !TAB_PATHS.includes(pathname)
  // The masthead is the homepage's only real headline, so there it is the h1.
  // Every other page supplies its own h1, so here it stays a plain div.
  const BrandTag: 'h1' | 'div' = pathname === '/' ? 'h1' : 'div'

  // Issue number: +1 each day since establishment (1 Nov 2025 = Issue 1)
  const EST_DATE = new Date(2025, 10, 1) // 1 Nov 2025
  const issueNo = Math.max(1, Math.floor((Date.now() - EST_DATE.getTime()) / 86_400_000) + 1)

  const today = new Date().toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="bg-white border-b" style={{ borderColor: 'var(--border-md)' }}>
      {/* Top accent stripe */}
      <div className="h-[2px]" style={{ background: 'var(--accent)' }} />

      {/* Edition line */}
      <div className="flex justify-between items-center px-4 pt-1.5">
        <span className="text-[8.5px] font-mono tracking-widest text-[var(--text3)]">
          {isHi ? 'भाग I · स्था. 11.2025' : 'VOL. I · EST. 11.2025'}
        </span>
        <span
          className="text-[8.5px] font-mono tracking-widest text-[var(--text3)]"
          suppressHydrationWarning
        >
          {isHi ? `अंक ${issueNo}` : `ISSUE No. ${issueNo}`}
        </span>
      </div>

      {/* Logo */}
      <div className="text-center px-4 py-2">
        <BrandTag className="font-display font-black text-[32px] tracking-[0.22em] uppercase text-[var(--text1)] leading-none">
          SatyaDheesh
        </BrandTag>
        <div className="font-display font-bold text-[14px] leading-none mt-1" style={{ color: 'var(--accent)' }}>
          सत्याधीश
        </div>
        <div className="text-[7.5px] font-mono tracking-[0.24em] text-[var(--text3)] uppercase mt-1.5">
          {isHi ? 'भारत का जमीनी सत्य अभिलेख' : "India's Ground Truth Record"}
        </div>
      </div>

      {/* Hairline */}
      <div className="mx-4 h-px" style={{ background: 'var(--border-md)' }} />

      {/* Status bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        {isDetailPage ? (
          <div className="flex-1 min-w-0"><BackButton /></div>
        ) : (
          <span
            className="text-[9.5px] font-mono text-[var(--text2)] flex-1 min-w-0 truncate"
            suppressHydrationWarning
          >
            {today}
          </span>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <LanguageSwitch compact />
          <NotificationBell />
          <div className="flex items-center gap-1.5 pl-0.5">
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 4px #1b7050' }} />
            <span className="text-[9px] font-mono font-semibold tracking-widest" style={{ color: 'var(--green)' }}>
              {isHi ? 'लाइव' : 'LIVE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

