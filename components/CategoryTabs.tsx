'use client'
import { useRef } from 'react'

import type { Language } from '@/lib/i18n'

// Exactly 8 tabs per spec — tab id maps to feed API key in HomeClient
const TABS = [
  { id: 'all',        label: 'All' },
  { id: 'flagged',    label: 'Civic Alerts ⚑' },
  { id: 'governance', label: 'Governance' },
  { id: 'economy',    label: 'Economy' },
  { id: 'justice',    label: 'Justice' },
  { id: 'health',     label: 'Health' },
  { id: 'farmers',    label: 'Farmers' },
  { id: 'corruption', label: 'Corruption' },
  { id: 'world',      label: 'World' },
]

const TAB_LABELS_HI: Record<string, string> = {
  all: 'सभी',
  flagged: 'नागरिक अलर्ट ⚑',
  governance: 'शासन',
  economy: 'अर्थव्यवस्था',
  justice: 'न्याय व अपराध',
  health: 'स्वास्थ्य',
  farmers: 'किसान व कृषि',
  corruption: 'भ्रष्टाचार',
  world: 'विश्व',
}

interface CategoryTabsProps {
  activeTab: string
  onChangeTab: (id: string) => void
  currentLang?: Language
}

export function CategoryTabs({ activeTab, onChangeTab, currentLang = 'en' }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto border-b no-scrollbar"
      style={{ borderColor: 'var(--border-md)', scrollbarWidth: 'none', background: 'var(--surface)' }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        const isFlagged = tab.id === 'flagged'
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
                style={{ background: isFlagged ? '#B02828' : 'var(--accent)' }}
              />
            )}
            <span
              className="text-[11px] font-semibold tracking-wide"
              style={{ 
                color: isActive 
                  ? (isFlagged ? '#B02828' : 'var(--accent)') 
                  : (isFlagged ? 'rgba(176,40,40,0.85)' : 'var(--text3)'),
                fontWeight: isFlagged ? 'bold' : '600'
              }}
            >
              {currentLang === 'hi' ? (TAB_LABELS_HI[tab.id] || tab.label) : tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
