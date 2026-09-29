'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import { SplashScreen } from './SplashScreen'

export function LanguageTransitionOverlay() {
  const { isTransitioning, targetLang } = useLanguage()
  const [active, setActive] = useState(false)
  const [persistedSubtitle, setPersistedSubtitle] = useState<string>('')

  useEffect(() => {
    if (isTransitioning) {
      setActive(true)
      const isSwitchingToHindi = targetLang === 'hi'
      setPersistedSubtitle(
        isSwitchingToHindi
          ? 'भाषा बदल रहे हैं · Switching to Hindi'
          : 'Switching language · अंग्रेज़ी में बदल रहे हैं'
      )
    }
  }, [isTransitioning, targetLang])

  if (!active && !isTransitioning) return null

  return (
    <SplashScreen
      forceShow
      subtitle={persistedSubtitle || 'भाषा बदल रहे हैं · Switching language'}
      minDuration={1400}
      readyToExit={!isTransitioning}
      onComplete={() => setActive(false)}
    />
  )
}

