'use client'

import { useEffect, useState } from 'react'

// First-visit intro: redaction wipes away -> scales weigh kept vs broken -> सत्य revealed.
// Plays once per browser (localStorage), ~1.7s, skippable, reduced-motion aware.
// Mount once near the root, e.g. in app/layout.tsx inside <body>.

const SEEN_KEY = 'satya_intro_seen_v1'

export function SatyaIntro() {
  const [show, setShow] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Only first visit
    try {
      if (localStorage.getItem(SEEN_KEY)) return
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // private mode etc. — still show once this session
    }
    setShow(true)

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const total = reduced ? 900 : 1950
    const t = setTimeout(() => dismiss(), total)

    const onSkip = () => dismiss()
    window.addEventListener('keydown', onSkip)
    window.addEventListener('wheel', onSkip, { passive: true })
    window.addEventListener('touchmove', onSkip, { passive: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onSkip)
      window.removeEventListener('wheel', onSkip)
      window.removeEventListener('touchmove', onSkip)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismiss() {
    setLeaving(true)
    setTimeout(() => setShow(false), 360)
  }

  if (!show) return null

  return (
    <div
      onClick={dismiss}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 360ms ease',
      }}
    >
      <style>{css}</style>

      {/* Beat 1 — redaction */}
      <div className="si-layer si-redaction">
        <div className="si-bars"><i /><i /><i /></div>
      </div>

      {/* Beat 2 — scales weigh kept vs broken */}
      <div className="si-layer si-scales">
        <svg width="210" height="150" viewBox="0 0 210 150" role="img" aria-label="scales weighing kept against broken">
          <line x1="105" y1="34" x2="105" y2="120" stroke="var(--text1)" strokeWidth="2" />
          <line x1="84" y1="120" x2="126" y2="120" stroke="var(--text1)" strokeWidth="2" strokeLinecap="round" />
          <polygon points="105,28 99,40 111,40" fill="var(--text1)" />
          <g className="si-beam">
            <line x1="53" y1="40" x2="157" y2="40" stroke="var(--text1)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="53" cy="66" r="11" fill="var(--green)" />
            <circle cx="157" cy="66" r="11" fill="var(--red)" />
          </g>
        </svg>
      </div>

      {/* Beat 3 — reveal */}
      <div className="si-layer si-reveal">
        <div className="si-word">सत्य</div>
        <div className="si-rule" />
        <div className="si-sub">truth, judged on evidence</div>
      </div>

      <button
        className="si-skip"
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        aria-label="Skip intro"
      >
        skip
      </button>
    </div>
  )
}

const css = `
.si-layer{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.si-word{font-family:var(--font-serif,Georgia,serif);font-size:64px;line-height:1;color:var(--text1)}
.si-sub{font-family:var(--font-mono,ui-monospace,monospace);font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--text2)}
.si-bars{display:flex;gap:7px}
.si-bars i{height:46px;background:var(--text1);transform-origin:left center}
.si-bars i:nth-child(1){width:40px}.si-bars i:nth-child(2){width:74px}.si-bars i:nth-child(3){width:30px}
.si-rule{height:2px;width:0;background:var(--accent)}
.si-beam{transform-box:fill-box;transform-origin:center}
.si-skip{position:absolute;bottom:20px;right:20px;background:none;border:0;cursor:pointer;font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text3)}

.si-redaction{animation:si-lr 1.95s ease-in-out forwards}
.si-bars i{animation:si-bw 1.95s ease-in-out forwards}
.si-scales{opacity:0;animation:si-ls 1.95s ease-in-out forwards}
.si-beam{animation:si-bm 1.95s ease-in-out forwards}
.si-reveal{opacity:0;animation:si-lv 1.95s ease-out forwards}
.si-rule{animation:si-rl 1.95s ease-out forwards}

@keyframes si-lr{0%,16%{opacity:1}22%,100%{opacity:0}}
@keyframes si-bw{0%,4%{transform:scaleX(1)}18%,100%{transform:scaleX(0)}}
@keyframes si-ls{0%,20%{opacity:0}26%,54%{opacity:1}60%,100%{opacity:0}}
@keyframes si-bm{0%,22%{transform:rotate(0)}32%{transform:rotate(10deg)}44%{transform:rotate(-7deg)}52%{transform:rotate(3deg)}56%,100%{transform:rotate(0)}}
@keyframes si-lv{0%,56%{opacity:0}66%,100%{opacity:1}}
@keyframes si-rl{0%,66%{width:0}82%,100%{width:150px}}

@media (prefers-reduced-motion: reduce){
  .si-redaction,.si-scales{display:none}
  .si-bars i,.si-beam{animation:none}
  .si-reveal{animation:si-fade .5s ease-out forwards}
  .si-rule{width:150px;animation:none}
  @keyframes si-fade{from{opacity:0}to{opacity:1}}
}
`
