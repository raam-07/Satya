'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Language, LANG_COOKIE, t } from '@/lib/i18n'
import { useToast } from '@/lib/ToastContext'

interface LanguageSwitchProps {
  currentLang?: Language
}

export function LanguageSwitch({ currentLang = 'en' }: LanguageSwitchProps) {
  const [lang, setLang] = useState<Language>(currentLang)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { showToast } = useToast()

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === lang || isPending) return

    setLang(newLang)

    // 1. Save to Cookie (1 year expiry) for SSR reading
    document.cookie = `${LANG_COOKIE}=${newLang}; path=/; max-age=31536000; SameSite=Lax`

    // 2. Save to localStorage for client-side persistence
    try {
      localStorage.setItem(LANG_COOKIE, newLang)
    } catch {}

    // 3. Show feedback toast
    const msg = newLang === 'hi' ? t('switched_to_hi', 'hi') : t('switched_to_en', 'en')
    showToast(msg)

    // 4. Trigger Next.js router refresh to reload Server Component data
    startTransition(() => {
      router.refresh()
    })
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
