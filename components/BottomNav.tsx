'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// Left side: FEED + NETAS | Center: S | Right: VAADE + DATA
const LEFT_TABS = [
  { label: 'FEED',  href: '/',      icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="16" height="3" rx="1" fill="currentColor"/>
      <rect x="2" y="9" width="10" height="2" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="2" y="14" width="13" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>
  )},
  { label: 'TIMELINES', href: '/timelines', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 3v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="5" cy="5" r="2" fill="currentColor"/>
      <circle cx="5" cy="10" r="2" fill="currentColor" opacity="0.6"/>
      <circle cx="5" cy="15" r="2" fill="currentColor" opacity="0.4"/>
      <rect x="9" y="4" width="9" height="2" rx="1" fill="currentColor"/>
      <rect x="9" y="9" width="7" height="2" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="9" y="14" width="8" height="2" rx="1" fill="currentColor" opacity="0.4"/>
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

  const [visited, setVisited] = useState<Record<string, boolean>>({
    '/': true,
    '/timelines': true,
    '/vaade': true,
    '/data': true,
  })

  // A tab owns its section's detail routes too: an /event/... page is part of
  // TIMELINES, a /news/... article is part of FEED — the tab stays lit.
  const SECTION_ROUTES: Record<string, string[]> = {
    '/':          ['/news'],
    '/timelines': ['/event'],
    '/vaade':     ['/promises'],
  }
  const isActive = (href: string) => {
    if (href === '/' ? pathname === '/' : pathname.startsWith(href)) return true
    return (SECTION_ROUTES[href] ?? []).some(p => pathname.startsWith(p))
  }

  useEffect(() => {
    const state: Record<string, boolean> = {}
    ;['/', '/timelines', '/vaade', '/data'].forEach(href => {
      const key = `satya_visited_${href === '/' ? 'feed' : href.replace('/', '')}`
      state[href] = localStorage.getItem(key) === 'true'
    })
    setVisited(state)
  }, [])

  useEffect(() => {
    ;['/', '/timelines', '/vaade', '/data'].forEach(href => {
      if (isActive(href)) {
        const key = `satya_visited_${href === '/' ? 'feed' : href.replace('/', '')}`
        if (localStorage.getItem(key) !== 'true') {
          localStorage.setItem(key, 'true')
          setVisited(prev => ({ ...prev, [href]: true }))
        }
      }
    })
  }, [pathname])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t safe-bottom"
      style={{ borderColor: 'var(--border-md)' }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes satya-beacon-pulse {
              0% { transform: scale(0.9); opacity: 0.9; }
              50% { transform: scale(1.4); opacity: 0.35; }
              100% { transform: scale(0.9); opacity: 0.9; }
            }
            .satya-beacon-pulse-effect {
              animation: satya-beacon-pulse 1.8s infinite ease-in-out;
            }
          `,
        }}
      />
      <div className="flex items-end h-14">
        {LEFT_TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors"
            style={{ color: isActive(tab.href) ? 'var(--accent)' : 'var(--text3)' }}
          >
            <div className="relative flex items-center justify-center">
              {tab.icon}
              {!visited[tab.href] && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="satya-beacon-pulse-effect absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
              )}
            </div>
            <span className="text-[8px] font-mono tracking-wider flex items-center gap-1">
              {tab.label}
            </span>
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
            <div className="relative flex items-center justify-center">
              {tab.icon}
              {!visited[tab.href] && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="satya-beacon-pulse-effect absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
              )}
            </div>
            <span className="text-[8px] font-mono tracking-wider">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
