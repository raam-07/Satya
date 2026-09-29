'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { Language } from '@/lib/i18n'

interface LanguageSwitchProps {
  currentLang?: Language
  compact?: boolean
}

export function LanguageSwitch({ currentLang: propLang, compact = false }: LanguageSwitchProps) {
  const { currentLang: contextLang, targetLang, isTransitioning, switchLanguage } = useLanguage()

  // Display the targetLang if currently transitioning, otherwise current language
  const activeLang = targetLang || contextLang || propLang || 'en'

  if (compact) {
    return (
      <div
        className="inline-flex items-center rounded-sm border p-0.5 bg-[var(--surface-alt)] select-none shadow-2xs"
        style={{ borderColor: 'var(--border-md)' }}
        role="group"
        aria-label="Language selection"
      >
        <button
          type="button"
          onClick={() => switchLanguage('en')}
          disabled={isTransitioning}
          className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold rounded-xs transition-all duration-200 leading-none ${
            activeLang === 'en'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text3)] hover:text-[var(--text1)]'
          }`}
          title="Switch to English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => switchLanguage('hi')}
          disabled={isTransitioning}
          className={`px-1.5 py-0.5 text-[9.5px] font-sans font-bold rounded-xs transition-all duration-200 leading-none ${
            activeLang === 'hi'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text3)] hover:text-[var(--text1)]'
          }`}
          title="हिन्दी में पढ़ें"
        >
          हिन्दी
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono tracking-wider uppercase text-[var(--text3)] hidden sm:inline">
        {activeLang === 'hi' ? 'भाषा' : 'Language'}:
      </span>
      <div
        className="inline-flex items-center rounded-sm border p-0.5 bg-[var(--surface)] select-none"
        style={{ borderColor: 'var(--border-md)' }}
        role="group"
        aria-label="Language selection"
      >
        <button
          type="button"
          onClick={() => switchLanguage('en')}
          disabled={isTransitioning}
          className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-sm transition-all duration-200 ${
            activeLang === 'en'
              ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
              : 'text-[var(--text2)] hover:text-[var(--text1)] hover:bg-[var(--bg-alt)]'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => switchLanguage('hi')}
          disabled={isTransitioning}
          className={`px-2.5 py-1 text-[11px] font-sans font-medium rounded-sm transition-all duration-200 ${
            activeLang === 'hi'
              ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
              : 'text-[var(--text2)] hover:text-[var(--text1)] hover:bg-[var(--bg-alt)]'
          }`}
        >
          हिन्दी
        </button>
      </div>
    </div>
  )
}

