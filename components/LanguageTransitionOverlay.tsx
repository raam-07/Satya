'use client'

import { useLanguage } from '@/lib/LanguageContext'

export function LanguageTransitionOverlay() {
  const { isTransitioning, targetLang } = useLanguage()

  if (!isTransitioning) return null

  const isSwitchingToHindi = targetLang === 'hi'

  return (
    <div
      className="fixed inset-0 z-[9990] flex flex-col items-center justify-center transition-all duration-300 animate-in fade-in"
      style={{
        background: 'rgba(250, 248, 245, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      role="status"
      aria-live="polite"
      aria-label={isSwitchingToHindi ? 'भाषा बदली जा रही है' : 'Switching language'}
    >
      {/* Top thin progress line */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[var(--border-md)] overflow-hidden z-50">
        <div
          className="h-full bg-[var(--accent)]"
          style={{
            width: '45%',
            animation: 'satyaShimmerSlide 1.2s infinite ease-in-out',
          }}
        />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes satyaShimmerSlide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `,
        }}
      />

      <div
        className="flex flex-col items-center gap-3.5 px-6 py-5 rounded-md bg-white border shadow-md text-center max-w-[280px]"
        style={{ borderColor: 'var(--border-md)' }}
      >
        {/* Animated small brand emblem */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-xs"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-md)' }}
        >
          <span className="font-display font-black text-[20px] text-[var(--accent)] animate-pulse">
            {isSwitchingToHindi ? 'स' : 'S'}
          </span>
        </div>

        <div>
          <div className="font-display font-black text-[16px] tracking-wide text-[var(--text1)]">
            {isSwitchingToHindi ? 'सत्याधीश' : 'SatyaDheesh'}
          </div>
          <div className="text-[11px] font-mono text-[var(--text2)] mt-1.5 flex items-center justify-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
            <span>{isSwitchingToHindi ? 'हिन्दी में लोड हो रहा है…' : 'Switching to English…'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
