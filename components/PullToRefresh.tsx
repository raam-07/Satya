'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 70   // px the user must pull before it triggers
const MAX_PULL  = 90
const DRAG_SLOP = 12   // Ignore micro-movements <= 12px so taps never drop clicks

/**
 * Mobile pull-to-refresh. When the page is scrolled to the top and the user
 * pulls down past THRESHOLD, it:
 *   1. router.refresh()  -> clears the client/route cache, re-fetches the
 *      current route from the server (server-cached data).
 *   2. dispatches 'satya-refresh-feed' -> the feed refetches with
 *      forceRefresh (no-store + cache-buster), bypassing the browser cache.
 * Touch-only, so it never affects desktop.
 */
export function PullToRefresh() {
  const router = useRouter()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)

  pullRef.current = pull
  refreshingRef.current = refreshing

  useEffect(() => {
    let rafId: number | null = null

    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !refreshingRef.current) {
        startY.current = e.touches[0].clientY
        pulling.current = true
      } else {
        pulling.current = false
      }
    }

    const onMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return
      // If user has scrolled down into the page, abort pull immediately so native scroll flows
      if (window.scrollY > 0) {
        pulling.current = false
        if (pullRef.current > 0) setPull(0)
        return
      }
      const delta = e.touches[0].clientY - startY.current
      // Only initiate pull state if user moves past the drag slop threshold
      if (delta > DRAG_SLOP) {
        const pullDistance = Math.min(MAX_PULL, (delta - DRAG_SLOP) * 0.5)
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            setPull(pullDistance)
            rafId = null
          })
        }
      } else if (delta < 0) {
        pulling.current = false
        if (pullRef.current > 0) setPull(0)
      }
    }

    const onEnd = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (!pulling.current) return
      pulling.current = false
      const currentPull = pullRef.current
      if (currentPull >= THRESHOLD && !refreshingRef.current) {
        setRefreshing(true)
        setPull(55)
        router.refresh()
        window.dispatchEvent(new CustomEvent('satya-refresh-feed'))
        setTimeout(() => {
          setRefreshing(false)
          setPull(0)
        }, 1000)
      } else if (currentPull > 0) {
        setPull(0)
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [router])

  const visible = pull > 0 || refreshing

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${visible ? pull : -40}px)`,
        opacity: visible ? 1 : 0,
        transition: pulling.current ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
      }}
    >
      <div className="mt-2 flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border-md)] px-3 py-1.5 rounded-full shadow-md">
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }}
        />
        <span className="text-[8.5px] font-mono tracking-widest uppercase text-[var(--text2)]">
          {refreshing ? 'Refreshing' : pull >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  )
}
