'use client'
import { useRef, useState } from 'react'

/** Tiny brand mark — sits right-aligned under the article summary.
 *  Looks like plain text, but a click summons a brief gavel knock. */
export function SummaryMark() {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const knock = () => {
    setShow(false)
    if (timer.current) clearTimeout(timer.current)
    // restart animation on rapid re-clicks
    requestAnimationFrame(() => {
      setShow(true)
      timer.current = setTimeout(() => setShow(false), 1000)
    })
  }

  return (
    <span className="block text-right mt-1 relative">
      {show && (
        <span
          className="absolute right-0 -top-6 satya-gavel pointer-events-none select-none"
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="12.5" y="2.5" width="8" height="4.5" rx="1" transform="rotate(45 16.5 4.75)" fill="var(--accent)" />
            <rect x="10" y="7.5" width="3" height="10" rx="1" transform="rotate(45 11.5 12.5)" fill="var(--text1)" />
            <rect x="3" y="19.5" width="10" height="2.5" rx="1" fill="var(--text1)" />
          </svg>
        </span>
      )}
      <button
        type="button"
        onClick={knock}
        className="font-display font-black text-[8px] tracking-[0.22em] uppercase select-none cursor-pointer bg-transparent border-0 p-0"
        style={{ color: 'var(--text3)' }}
        aria-label="SatyaDheesh"
      >
        — SatyaDheesh
      </button>
    </span>
  )
}
