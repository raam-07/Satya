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
    <span className="block text-right mt-1">
      <button
        type="button"
        onClick={knock}
        className="font-display font-black text-[8px] tracking-[0.22em] uppercase select-none cursor-pointer bg-transparent border-0 p-0"
        style={{ color: 'var(--text3)', position: 'relative', display: 'inline-block' }}
        aria-label="SatyaDheesh"
      >
        {show && (
          <span
            className="pointer-events-none select-none"
            style={{ position: 'absolute', top: -22, left: '50%', marginLeft: -9, lineHeight: 0 }}
            aria-hidden="true"
          >
            <span className="satya-gavel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="10.75" y="3" width="2.5" height="12" rx="1" fill="var(--text1)" />
                <rect x="6" y="15" width="12" height="6" rx="1.5" fill="var(--accent)" />
              </svg>
            </span>
          </span>
        )}
        — SatyaDheesh
      </button>
    </span>
  )
}
