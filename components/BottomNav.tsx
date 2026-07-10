'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Left side: FEED + NETAS | Center: S | Right: VAADE + DATA
const LEFT_TABS = [
  { label: 'FEED',  href: '/',      icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="16" height="3" rx="1" fill="currentColor"/>
      <rect x="2" y="9" width="10" height="2" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="2" y="14" width="13" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>
  )},
  { label: 'NETAS', href: '/netas', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3.5" fill="currentColor"/>
      <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )},
]

const RIGHT_TABS = [
  { label: 'VAADE', href: '/vaade', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M6 10l2.5 2.5L14 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { label: 'DATA',  href: '/data',  icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2"  y="11" width="4" height="7" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="8"  y="7"  width="4" height="11" rx="1" fill="currentColor" opacity="0.75"/>
      <rect x="14" y="3"  width="4" height="15" rx="1" fill="currentColor"/>
    </svg>
  )},
]

interface BottomNavProps {
  onSearchOpen: () => void
}

export function BottomNav({ onSearchOpen }: BottomNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t safe-bottom"
      style={{ borderColor: 'var(--border-md)' }}
    >
      <div className="flex items-end h-14">
        {LEFT_TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors"
            style={{ color: isActive(tab.href) ? 'var(--accent)' : 'var(--text3)' }}
          >
            {tab.icon}
            <span className="text-[8px] font-mono tracking-wider">{tab.label}</span>
          </Link>
        ))}

        {/* Center S button — dark, elevated */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2 relative">
          <button
            onClick={onSearchOpen}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
            style={{
              background: 'var(--text1)',
              boxShadow: '0 4px 14px rgba(26,26,26,0.35)',
              transform: 'translateY(-6px)',
            }}
            aria-label="Search"
          >
            <span className="font-black font-display text-[18px] tracking-tight leading-none" style={{ color: '#fff' }}>S</span>
          </button>
        </div>

        {RIGHT_TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors"
            style={{ color: isActive(tab.href) ? 'var(--accent)' : 'var(--text3)' }}
          >
            {tab.icon}
            <span className="text-[8px] font-mono tracking-wider">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
