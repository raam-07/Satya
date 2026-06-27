'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 70   // px the user must pull before it triggers
const MAX_PULL  = 90

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

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !refreshing) {
        startY.current = e.touches[0].clientY
        pulling.current = true
      } else {
        pulling.current = false
      }
    }

    const onMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        setPull(Math.min(MAX_PULL, delta * 0.5))
      } else {
        pulling.current = false
        setPull(0)
      }
    }

    const onEnd = () => {
      if (!pulling.current) return
      pulling.current = false
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true)
        setPull(55)
        router.refresh()
        window.dispatchEvent(new CustomEvent('satya-refresh-feed'))
        setTimeout(() => {
          setRefreshing(false)
          setPull(0)
        }, 1000)
      } else {
        setPull(0)
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [pull, refreshing, router])

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
