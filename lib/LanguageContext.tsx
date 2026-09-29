'use client'

import React, { createContext, useContext, useState, useTransition, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Language, LANG_COOKIE, t } from '@/lib/i18n'
import { useToast } from '@/lib/ToastContext'

interface LanguageContextProps {
  currentLang: Language
  targetLang: Language | null
  isTransitioning: boolean
  switchLanguage: (newLang: Language) => void
}

const LanguageContext = createContext<LanguageContextProps>({
  currentLang: 'en',
  targetLang: null,
  isTransitioning: false,
  switchLanguage: () => {},
})

export function LanguageProvider({
  children,
  initialLang = 'en',
}: {
  children: React.ReactNode
  initialLang?: Language
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()

  const [currentLang, setCurrentLang] = useState<Language>(initialLang)
  const [targetLang, setTargetLang] = useState<Language | null>(null)
  const [isPending, startTransition] = useTransition()

  // On client mount or pathname change, sync with URL searchParams or cookie
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const urlLang = params.get('lang')
    if (urlLang === 'hi' || urlLang === 'en') {
      setCurrentLang(urlLang)
      return
    }
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))
    if (match && (match[1] === 'hi' || match[1] === 'en')) {
      setCurrentLang(match[1] as Language)
    } else if (initialLang) {
      setCurrentLang(initialLang)
    }
  }, [initialLang, pathname])

  // When Next.js transition completes (isPending turns false), clear targetLang
  useEffect(() => {
    if (!isPending && targetLang) {
      setTargetLang(null)
    }
  }, [isPending, targetLang])

  const switchLanguage = useCallback(
    (newLang: Language) => {
      if (newLang === currentLang || isPending) return

      // Immediate visual feedback for the button state
      setTargetLang(newLang)
      setCurrentLang(newLang)

      // 1. Set cookie for SSR
      document.cookie = `${LANG_COOKIE}=${newLang}; path=/; max-age=31536000; SameSite=Lax`

      // 2. Set localStorage for client persistence
      try {
        localStorage.setItem(LANG_COOKIE, newLang)
      } catch {}

      // 3. Prepare target URL preserving existing query params
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        if (newLang === 'hi') {
          url.searchParams.set('lang', 'hi')
        } else {
          url.searchParams.delete('lang')
        }
        const targetUrl = url.pathname + url.search

        // 4. Show friendly toast
        const msg = newLang === 'hi' ? t('switched_to_hi', 'hi') : t('switched_to_en', 'en')
        showToast(msg)

        // 5. Start smooth Next.js transition without full reload
        startTransition(() => {
          router.replace(targetUrl, { scroll: false })
          router.refresh()
        })
      }
    },
    [currentLang, isPending, router, showToast]
  )

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        targetLang,
        isTransitioning: isPending,
        switchLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
