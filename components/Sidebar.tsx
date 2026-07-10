'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { partySlugify } from '@/lib/utils'

const canonicalizeHref = (href: string): string => {
  if (href.startsWith('/party/')) {
    const parts = href.split('/')
    const partyName = parts[parts.length - 1]
    return `/party/${partySlugify(partyName)}`
  }
  return href
}

const NAV = [
  { label: 'Feed',           href: '/',          icon: '◉' },
  { label: 'Timelines',      href: '/timelines', icon: '◈' },
  { label: 'Vaade',          href: '/vaade', icon: '◧',
    children: [
      { label: 'All Promises', href: '/vaade' },
      { label: 'Netas — Parties & Ministers', href: '/netas' },
      { label: 'BJP',  href: '/party/bjp' },
      { label: 'INC',  href: '/party/inc' },
    ],
  },
  { label: 'Data',           href: '/data',  icon: '◻' },
  {
    label: 'States',
    href: '/state/delhi',
    icon: '◫',
    children: [
      { label: 'Delhi',   href: '/state/delhi' },
      { label: 'Kerala',  href: '/state/kerala' },
      { label: 'Gujarat', href: '/state/gujarat' },
    ],
  },
  {
    label: 'Topics',
    href: '/topic/crime_violence',
    icon: '◎',
    children: [
      { label: 'Crime & Violence', href: '/topic/crime_violence' },
      { label: 'Corruption',       href: '/topic/corruption_scam' },
      { label: 'Economy',          href: '/topic/economy' },
    ],
  },
  { label: 'About SatyaDheesh', href: '/about', icon: '◻' },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  return (
    <aside
      className="flex-shrink-0 h-screen flex flex-col border-r border-[var(--border-md)] bg-[var(--surface)] transition-all duration-200 overflow-hidden"
      style={{ width: collapsed ? 48 : 220 }}
    >
      {/* Logo / toggle */}
      <div className="border-b border-[var(--border-md)] flex items-center" style={{ height: 56 }}>
        {!collapsed && (
          <Link href="/" className="flex-1 px-4">
            <div className="font-display font-black text-[18px] tracking-[0.18em] uppercase text-[var(--text1)] leading-none">
              SatyaDheesh
            </div>
            <div className="text-[9px] tracking-[0.2em] text-[var(--text3)] font-mono uppercase mt-0.5">
              सत्याधीश
            </div>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 flex items-center justify-center text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
          style={{ width: 48, height: 56 }}
          aria-label="Toggle sidebar"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('/').slice(0, 2).join('/')))
          const isOpen = openGroup === item.label

          return (
            <div key={item.label}>
              {item.children ? (
                <button
                  onClick={() => setOpenGroup(isOpen ? null : item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-alt)] ${
                    active ? 'text-accent' : 'text-[var(--text2)]'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="w-6 text-center text-[14px] flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="text-[12px] font-medium flex-1 truncate">{item.label}</span>
                      <span className="text-[10px] text-[var(--text3)]">{isOpen ? '▾' : '▸'}</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--bg-alt)] ${
                    active
                      ? 'text-accent border-r-2 border-accent bg-[rgba(191,74,7,0.05)]'
                      : 'text-[var(--text2)]'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="w-6 text-center text-[14px] flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="text-[12px] font-medium truncate">{item.label}</span>
                  )}
                </Link>
              )}

              {/* Sub-items */}
              {item.children && isOpen && !collapsed && (
                <div className="ml-9 border-l border-[var(--border-md)]">
                  {item.children.map((child) => {
                    const canonicalChildHref = canonicalizeHref(child.href)
                    return (
                      <Link
                        key={child.href}
                        href={canonicalChildHref}
                        className={`block px-3 py-2 text-[11px] transition-colors hover:text-accent ${
                          pathname === canonicalChildHref ? 'text-accent font-semibold' : 'text-[var(--text3)]'
                        }`}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-[9px] font-mono tracking-wider text-[var(--text3)] uppercase">
            India's Ground Truth Record
          </p>
        </div>
      )}
    </aside>
  )
}
