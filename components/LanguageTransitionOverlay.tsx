'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import { SplashScreen } from './SplashScreen'

export function LanguageTransitionOverlay() {
  const { isTransitioning, targetLang } = useLanguage()
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (isTransitioning) {
      setActive(true)
    }
  }, [isTransitioning])

  if (!active && !isTransitioning) return null

  const isSwitchingToHindi = targetLang === 'hi'
  const subtitle = isSwitchingToHindi
    ? 'भाषा बदल रहे हैं · Switching to Hindi'
    : 'Switching language · अंग्रेज़ी में बदल रहे हैं'

  return (
    <SplashScreen
      forceShow
      subtitle={subtitle}
      minDuration={1400}
      onComplete={() => setActive(false)}
    />
  )
}

