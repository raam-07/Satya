'use client'
import { useRef } from 'react'

// Exactly 8 tabs per spec — tab id maps to feed API key in HomeClient
const TABS = [
  { id: 'all',        label: 'All' },
  { id: 'governance', label: 'Governance' },
  { id: 'economy',    label: 'Economy' },
  { id: 'justice',    label: 'Justice' },
  { id: 'health',     label: 'Health' },
  { id: 'farmers',    label: 'Farmers' },
  { id: 'corruption', label: 'Corruption' },
  { id: 'world',      label: 'World' },
]

interface CategoryTabsProps {
  activeTab: string
  onChangeTab: (id: string) => void
}

export function CategoryTabs({ activeTab, onChangeTab }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto bg-white border-b no-scrollbar"
      style={{ borderColor: 'var(--border-md)', scrollbarWidth: 'none' }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className="flex-shrink-0 px-4 py-2.5 relative transition-colors"
            style={{ minWidth: 72 }}
          >
            {isActive && (
              <div
                className="absolute bottom-0 left-3 right-3 h-[2px]"
                style={{ background: 'var(--accent)' }}
              />
            )}
            <span
              className="text-[11px] font-semibold tracking-wide"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text3)' }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
