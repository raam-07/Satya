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
  const [isTransitioning, setIsTransitioning] = useState(false)
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

  // Listen for language mounted event from page components (HomeClient / Shell)
  useEffect(() => {
    if (!targetLang && !isTransitioning) return

    const handleMounted = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang: Language }>
      const mountedLang = customEvent.detail?.lang
      if (mountedLang && (mountedLang === targetLang || !targetLang)) {
        setIsTransitioning(false)
        setTargetLang(null)
      }
    }

    window.addEventListener('satya-lang-mounted', handleMounted)

    // Failsafe timeout: clear transitioning state after 3.8s if no event fired
    const failsafe = setTimeout(() => {
      setIsTransitioning(false)
      setTargetLang(null)
    }, 3800)

    return () => {
      window.removeEventListener('satya-lang-mounted', handleMounted)
      clearTimeout(failsafe)
    }
  }, [targetLang, isTransitioning])

  // Also clear transition if initialLang prop catches up with targetLang
  useEffect(() => {
    if (targetLang && initialLang === targetLang) {
      setIsTransitioning(false)
      setTargetLang(null)
    }
  }, [initialLang, targetLang])

  const switchLanguage = useCallback(
    (newLang: Language) => {
      if (newLang === currentLang || isTransitioning) return

      // Set target language and transition state
      setTargetLang(newLang)
      setIsTransitioning(true)
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
    [currentLang, isTransitioning, router, showToast]
  )

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        targetLang,
        isTransitioning: isTransitioning || isPending,
        switchLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
