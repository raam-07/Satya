'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Language, LANG_COOKIE, t } from '@/lib/i18n'
import { useToast } from '@/lib/ToastContext'

interface LanguageSwitchProps {
  currentLang?: Language
  compact?: boolean
}

export function LanguageSwitch({ currentLang, compact = false }: LanguageSwitchProps) {
  const [lang, setLang] = useState<Language>(currentLang || 'en')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { showToast } = useToast()

  // On client mount, sync with cookie or URL param if not explicitly passed
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const urlLang = urlParams.get('lang')
    if (urlLang === 'hi' || urlLang === 'en') {
      setLang(urlLang)
      return
    }

    const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))
    if (match && (match[1] === 'hi' || match[1] === 'en')) {
      setLang(match[1] as Language)
    } else if (currentLang) {
      setLang(currentLang)
    }
  }, [currentLang])

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === lang || isPending) return

    setLang(newLang)

    // 1. Save to Cookie (1 year expiry) for SSR reading
    document.cookie = `${LANG_COOKIE}=${newLang}; path=/; max-age=31536000; SameSite=Lax`

    // 2. Save to localStorage for client-side persistence
    try {
      localStorage.setItem(LANG_COOKIE, newLang)
    } catch {}

    // 3. Keep URL searchParam synchronized if user navigates with query
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (newLang === 'hi') {
        url.searchParams.set('lang', 'hi')
      } else {
        url.searchParams.delete('lang')
      }
      window.history.replaceState({}, '', url.toString())
    }

    // 4. Show feedback toast
    const msg = newLang === 'hi' ? t('switched_to_hi', 'hi') : t('switched_to_en', 'en')
    showToast(msg)

    // 5. Trigger Next.js router refresh to reload Server Component data
    startTransition(() => {
      router.refresh()
    })
  }

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
          onClick={() => handleLanguageChange('en')}
          disabled={isPending}
          className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold rounded-xs transition-all duration-150 leading-none ${
            lang === 'en'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text3)] hover:text-[var(--text1)]'
          }`}
          title="Switch to English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => handleLanguageChange('hi')}
          disabled={isPending}
          className={`px-1.5 py-0.5 text-[9.5px] font-sans font-bold rounded-xs transition-all duration-150 leading-none ${
            lang === 'hi'
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
        {lang === 'hi' ? 'भाषा' : 'Language'}:
      </span>
      <div
        className="inline-flex items-center rounded-sm border p-0.5 bg-[var(--surface)] select-none"
        style={{ borderColor: 'var(--border-md)' }}
        role="group"
        aria-label="Language selection"
      >
        <button
          type="button"
          onClick={() => handleLanguageChange('en')}
          disabled={isPending}
          className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-sm transition-all duration-150 ${
            lang === 'en'
              ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
              : 'text-[var(--text2)] hover:text-[var(--text1)] hover:bg-[var(--bg-alt)]'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => handleLanguageChange('hi')}
          disabled={isPending}
          className={`px-2.5 py-1 text-[11px] font-sans font-medium rounded-sm transition-all duration-150 ${
            lang === 'hi'
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
