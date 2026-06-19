'use client'
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onExitStart?: () => void
  onComplete: () => void
}

export function SplashScreen({ onExitStart, onComplete }: SplashScreenProps) {
  const [mounted, setMounted] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Check if user has already seen the splash screen in this session
    const hasSeen = sessionStorage.getItem('satya_splash_seen')
    if (hasSeen === 'true') {
      onComplete()
      return
    }

    setMounted(true)

    // Disable body scroll when splash screen is active
    document.body.style.overflow = 'hidden'

    // Phase 1: Wait for animation sequence to complete (approx 2.4s)
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
      if (onExitStart) onExitStart()
    }, 2400)

    // Phase 2: Wait for CSS fade-out transition to complete (700ms)
    const completeTimer = setTimeout(() => {
      sessionStorage.setItem('satya_splash_seen', 'true')
      document.body.style.overflow = ''
      onComplete()
    }, 3100)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
      document.body.style.overflow = ''
    }
  }, [onComplete])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAF8F5] transition-all duration-700 ease-in-out ${
        isExiting ? 'opacity-0 scale-[0.98] pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Inline styles for keyframe animations to keep the component modular */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes splashBlurFadeIn {
              0% {
                opacity: 0;
                filter: blur(12px);
                transform: translateY(-8px);
              }
              100% {
                opacity: 1;
                filter: blur(0);
                transform: translateY(0);
              }
            }

            @keyframes splashLineDraw {
              0% {
                width: 0;
                opacity: 0;
              }
              50% {
                width: 0;
                opacity: 1;
              }
              100% {
                width: 140px;
                opacity: 1;
              }
            }

            @keyframes splashEnglishTracking {
              0% {
                opacity: 0;
                filter: blur(8px);
                letter-spacing: 0.12em;
                transform: scale(0.97);
              }
              40% {
                opacity: 1;
                filter: blur(0);
              }
              100% {
                opacity: 1;
                letter-spacing: 0.26em;
                transform: scale(1);
              }
            }

            @keyframes splashTaglineSlideUp {
              0% {
                opacity: 0;
                filter: blur(4px);
                transform: translateY(6px);
              }
              100% {
                opacity: 0.8;
                filter: blur(0);
                transform: translateY(0);
              }
            }

            .animate-splash-sanskrit {
              animation: splashBlurFadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .animate-splash-line {
              animation: splashLineDraw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              animation-delay: 0.3s;
            }

            .animate-splash-english {
              animation: splashEnglishTracking 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              animation-delay: 0.7s;
            }

            .animate-splash-tagline {
              animation: splashTaglineSlideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              animation-delay: 1.2s;
            }
          `
        }}
      />

      <div className="flex flex-col items-center justify-center text-center px-6">
        {/* Sanskrit Logo */}
        <div
          className="font-serif font-black text-[30px] sm:text-[36px] text-[var(--accent)] tracking-[0.05em] leading-none opacity-0 animate-splash-sanskrit"
          style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
        >
          सत्याधीश
        </div>

        {/* Separator Accent Line */}
        <div className="h-px bg-[var(--accent)] my-4 opacity-0 animate-splash-line" />

        {/* English Brand Name */}
        <div
          className="font-serif font-black text-[26px] sm:text-[32px] text-[var(--text1)] uppercase leading-none opacity-0 animate-splash-english"
          style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
        >
          SatyaDheesh
        </div>

        {/* Monospace Tagline */}
        <div
          className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-[var(--text3)] uppercase mt-3.5 opacity-0 animate-splash-tagline"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          India's Ground Truth Record
        </div>
      </div>
    </div>
  )
}
