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

    // Phase 1: Wait for animation sequence to complete (approx 2.7s)
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
      if (onExitStart) onExitStart()
    }, 2800)

    // Phase 2: Wait for CSS fade-out transition to complete (700ms)
    const completeTimer = setTimeout(() => {
      sessionStorage.setItem('satya_splash_seen', 'true')
      document.body.style.overflow = ''
      onComplete()
    }, 3500)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
      document.body.style.overflow = ''
    }
  }, [onComplete, onExitStart])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        isExiting ? 'opacity-0 scale-[0.97] pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle, #FAF8F5 65%, #F4EFE6 100%)'
      }}
    >
      {/* Inline styles for masterclass keyframe animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Self-drawing outlines for the Sound Block line */
            @keyframes splashDrawLine {
              0% {
                stroke-dashoffset: 60;
                opacity: 0;
              }
              20% {
                stroke-dashoffset: 60;
                opacity: 1;
              }
              100% {
                stroke-dashoffset: 0;
                opacity: 1;
              }
            }

            /* Gavel swing and impact rebound (aligned to 1.8s total duration, impact at 50% / 0.9s) */
            @keyframes splashGavelSwing {
              0% {
                transform: rotate(55deg);
                transform-origin: 115px 70px;
                transform-box: view-box;
                opacity: 0;
              }
              16.7% {
                transform: rotate(55deg);
                transform-origin: 115px 70px;
                transform-box: view-box;
                opacity: 1;
              }
              32% {
                transform: rotate(62deg);
                transform-origin: 115px 70px;
                transform-box: view-box;
                opacity: 1;
              }
              50% {
                transform: rotate(0deg);
                transform-origin: 115px 70px;
                transform-box: view-box;
                opacity: 1;
              }
              55% {
                transform: rotate(8deg);
                transform-origin: 115px 70px;
                transform-box: view-box;
                opacity: 1;
              }
              60% {
                transform: rotate(0deg);
                transform-origin: 115px 70px;
                transform-box: view-box;
                opacity: 1;
              }
              100% {
                transform: rotate(0deg);
                transform-origin: 115px 70px;
                transform-box: view-box;
                opacity: 1;
              }
            }

            /* Concentric ripples radiating from impact */
            @keyframes splashWave1 {
              0%, 50% { r: 0; opacity: 0; }
              51% { r: 1px; opacity: 0.9; }
              100% { r: 38px; opacity: 0; }
            }
            @keyframes splashWave2 {
              0%, 53% { r: 0; opacity: 0; }
              54% { r: 1px; opacity: 0.7; }
              100% { r: 32px; opacity: 0; }
            }
            @keyframes splashWave3 {
              0%, 56% { r: 0; opacity: 0; }
              57% { r: 1px; opacity: 0.45; }
              100% { r: 26px; opacity: 0; }
            }

            /* Micro physical screen/container vibration on impact */
            @keyframes splashScreenShake {
              0%, 50% { transform: translate(0, 0); }
              51% { transform: translate(1px, -1.5px); }
              53% { transform: translate(-1.5px, 1px); }
              55% { transform: translate(1px, 1px); }
              57% { transform: translate(-0.5px, -0.5px); }
              59% { transform: translate(0, 0); }
              100% { transform: translate(0, 0); }
            }

            /* Parabolic ink splatter particles */
            @keyframes splashParticle1 {
              0%, 50% { transform: translate(0, 0) scale(1); opacity: 0; }
              51% { opacity: 1; }
              100% { transform: translate(-34px, -14px) scale(0.4); opacity: 0; }
            }
            @keyframes splashParticle2 {
              0%, 50% { transform: translate(0, 0) scale(1); opacity: 0; }
              51% { opacity: 1; }
              100% { transform: translate(-38px, 4px) scale(0.4); opacity: 0; }
            }
            @keyframes splashParticle3 {
              0%, 50% { transform: translate(0, 0) scale(1); opacity: 0; }
              51% { opacity: 1; }
              100% { transform: translate(34px, -16px) scale(0.4); opacity: 0; }
            }
            @keyframes splashParticle4 {
              0%, 50% { transform: translate(0, 0) scale(1); opacity: 0; }
              51% { opacity: 1; }
              100% { transform: translate(38px, 3px) scale(0.4); opacity: 0; }
            }
            @keyframes splashParticle5 {
              0%, 50% { transform: translate(0, 0) scale(1); opacity: 0; }
              51% { opacity: 1; }
              100% { transform: translate(-10px, -28px) scale(0.4); opacity: 0; }
            }
            @keyframes splashParticle6 {
              0%, 50% { transform: translate(0, 0) scale(1); opacity: 0; }
              51% { opacity: 1; }
              100% { transform: translate(12px, -26px) scale(0.4); opacity: 0; }
            }

            /* Sanskrit Satya fade-in */
            @keyframes splashSatyaFade {
              0% {
                opacity: 0;
                filter: blur(6px);
                transform: scale(0.96);
              }
              27.8% {
                opacity: 1;
                filter: blur(0);
                transform: scale(1);
              }
              100% {
                opacity: 1;
                filter: blur(0);
                transform: scale(1);
              }
            }

            /* Sanskrit Dheesh stamp (Squash and Stretch) */
            @keyframes splashDheeshStamp {
              0%, 50% {
                opacity: 0;
                transform: translateY(-24px) scaleY(1.4) scaleX(0.85);
                filter: blur(8px);
              }
              51.5% {
                opacity: 0.85;
              }
              53% {
                opacity: 1;
                transform: translateY(0) scaleY(0.76) scaleX(1.18); /* Squash */
                filter: blur(0);
              }
              56.5% {
                transform: translateY(-3px) scaleY(1.08) scaleX(0.95); /* Rebound */
              }
              60% {
                transform: translateY(0) scaleY(1) scaleX(1); /* Settle */
              }
              100% {
                opacity: 1;
                transform: translateY(0) scaleY(1) scaleX(1);
                filter: blur(0);
              }
            }

            /* English SatyaDheesh tracking expand */
            @keyframes splashEnglishFadeExpand {
              0%, 60% {
                opacity: 0;
                letter-spacing: 0.08em;
                filter: blur(8px);
                transform: scale(0.96);
              }
              85% {
                opacity: 1;
                filter: blur(0);
              }
              100% {
                opacity: 1;
                letter-spacing: 0.24em;
                transform: scale(1);
              }
            }

            /* Tagline slide up */
            @keyframes splashTaglineFadeSlide {
              0%, 72% {
                opacity: 0;
                transform: translateY(6px);
                filter: blur(4px);
              }
              100% {
                opacity: 0.85;
                transform: translateY(0);
                filter: blur(0);
              }
            }

            /* Animation Class Triggers */
            .animate-splash-draw-line {
              stroke-dasharray: 60;
              stroke-dashoffset: 60;
              animation: splashDrawLine 0.5s ease-out forwards;
            }

            .animate-splash-gavel {
              transform-origin: 115px 70px;
              transform-box: view-box;
              animation: splashGavelSwing 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            }

            .animate-splash-wave-1 {
              animation: splashWave1 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-splash-wave-2 {
              animation: splashWave2 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-splash-wave-3 {
              animation: splashWave3 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .animate-splash-shake {
              animation: splashScreenShake 1.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
            }

            .animate-splash-particle-1 { animation: splashParticle1 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-splash-particle-2 { animation: splashParticle2 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-splash-particle-3 { animation: splashParticle3 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-splash-particle-4 { animation: splashParticle4 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-splash-particle-5 { animation: splashParticle5 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-splash-particle-6 { animation: splashParticle6 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }

            .animate-splash-satya {
              animation: splashSatyaFade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              animation-delay: 0.1s;
            }

            .animate-splash-dheesh {
              animation: splashDheeshStamp 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            }

            .animate-splash-english {
              animation: splashEnglishFadeExpand 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .animate-splash-tagline {
              animation: splashTaglineFadeSlide 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `
        }}
      />

      <div className="flex flex-col items-center justify-center text-center px-6 animate-splash-shake">
        {/* Minimal Vector Gavel & sounding block */}
        <svg width="140" height="110" viewBox="0 0 140 110" className="mb-2">
          {/* Sound block line (self-drawing) */}
          <line
            x1="30"
            y1="85"
            x2="90"
            y2="85"
            stroke="var(--border-hi)"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-splash-draw-line"
          />

          {/* Concentric Wave Ripples */}
          <circle
            cx="60"
            cy="84"
            r="0"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.2"
            className="animate-splash-wave-1"
          />
          <circle
            cx="60"
            cy="84"
            r="0"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            className="animate-splash-wave-2"
          />
          <circle
            cx="60"
            cy="84"
            r="0"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.8"
            className="animate-splash-wave-3"
          />

          {/* Ink Splatter Particles */}
          <circle cx="60" cy="84" r="1.5" fill="var(--accent)" className="animate-splash-particle-1" />
          <circle cx="60" cy="84" r="1.5" fill="var(--accent)" className="animate-splash-particle-2" />
          <circle cx="60" cy="84" r="1.5" fill="var(--accent)" className="animate-splash-particle-3" />
          <circle cx="60" cy="84" r="1.5" fill="var(--accent)" className="animate-splash-particle-4" />
          <circle cx="60" cy="84" r="1.5" fill="var(--accent)" className="animate-splash-particle-5" />
          <circle cx="60" cy="84" r="1.5" fill="var(--accent)" className="animate-splash-particle-6" />

          {/* Gavel Group (Head + Handle) - Balanced Bounding Box centered exactly on (115,70) */}
          <g
            className="animate-splash-gavel"
            transform="rotate(55 115 70)"
            style={{
              transformOrigin: '115px 70px',
              transformBox: 'view-box'
            }}
          >
            {/* Transparent balancing element to force bounding box center to align with (115,70) */}
            <rect x="115" y="56" width="62" height="28" fill="none" opacity="0" pointer-events="none" />

            {/* Handle (Solid Line) */}
            <line
              x1="115"
              y1="70"
              x2="67"
              y2="70"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Gavel Head (Solid Group) */}
            <g>
              <rect x="53" y="56" width="14" height="28" rx="2" fill="var(--accent)" />
              {/* Head details */}
              <line x1="53" y1="62" x2="67" y2="62" stroke="#FAF8F5" strokeWidth="1.5" />
              <line x1="53" y1="78" x2="67" y2="78" stroke="#FAF8F5" strokeWidth="1.5" />
            </g>
          </g>
        </svg>

        {/* Devanagari Split Logo (Dotted-Circle Bug Gated via Clip-Path Overlays of full 'सत्याधीश' word) */}
        <div
          className="relative font-serif font-black text-[32px] sm:text-[38px] tracking-[0.02em] leading-none mb-1 h-[40px] sm:h-[48px] w-full max-w-[320px] flex items-center justify-center"
          style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
        >
          {/* 1. Ghost text to reserve space */}
          <span className="invisible select-none">सत्याधीश</span>

          {/* 2. Absolute overlay for "सत्य" (black, clipped to left 46.5% to avoid isolating combines) */}
          <span
            className="absolute inset-0 flex items-center justify-center opacity-0 animate-splash-satya select-none text-[var(--text1)]"
            style={{ clipPath: 'inset(0 53.5% 0 0)' }}
          >
            सत्याधीश
          </span>

          {/* 3. Absolute overlay for "ाधीश" (orange stamp, clipped to right 54% to avoid isolating combines) */}
          <span
            className="absolute inset-0 flex items-center justify-center opacity-0 animate-splash-dheesh text-[var(--accent)]"
            style={{ clipPath: 'inset(0 0 0 46%)' }}
          >
            सत्याधीश
          </span>
        </div>

        {/* English Brand Name */}
        <div
          className="font-serif font-black text-[24px] sm:text-[28px] leading-none uppercase opacity-0 animate-splash-english mt-2"
          style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
        >
          <span className="text-[var(--text1)]">Satya</span>
          <span className="text-[var(--accent)]">Dheesh</span>
        </div>

        {/* Monospace Tagline */}
        <div
          className="font-mono text-[9.5px] sm:text-[10.5px] tracking-[0.25em] text-[var(--text3)] uppercase mt-4 opacity-0 animate-splash-tagline"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          India's Ground Truth Record
        </div>
      </div>
    </div>
  )
}
