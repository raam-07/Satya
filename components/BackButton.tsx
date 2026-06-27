'use client'
import { useRouter } from 'next/navigation'

/**
 * Back control for detail pages. Goes back in history if there is any,
 * otherwise falls back to the home feed (so a direct/shared link never
 * dead-ends).
 */
export function BackButton() {
  const router = useRouter()

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <button
      onClick={goBack}
      aria-label="Go back"
      className="flex items-center gap-1 text-[10px] font-mono tracking-widest uppercase text-[var(--text2)] hover:text-[var(--accent)] transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  )
}
