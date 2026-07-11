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
            style={{ position: 'absolute', top: -24, left: '50%', marginLeft: -16, lineHeight: 0 }}
            aria-hidden="true"
          >
            <svg width="32" height="26" viewBox="0 0 40 32" fill="none">
              <g
                className="satya-gavel"
                transform="rotate(55 34 20)"
                style={{ transformOrigin: '34px 20px', transformBox: 'view-box' }}
              >
                <rect x="34" y="16" width="5" height="8" fill="none" opacity="0" />
                <line x1="34" y1="20" x2="15" y2="20" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
                <rect x="9" y="14" width="6.5" height="12" rx="1.2" fill="var(--accent)" />
              </g>
            </svg>
          </span>
        )}
        — SatyaDheesh
      </button>
    </span>
  )
}
