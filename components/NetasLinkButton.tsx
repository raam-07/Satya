'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function NetasLinkButton() {
  const [visited, setVisited] = useState(true)

  useEffect(() => {
    // Check if user has visited the netas page
    const hasVisited = localStorage.getItem('satya_visited_netas') === 'true'
    setVisited(hasVisited)
  }, [])

  return (
    <Link
      href="/netas"
      className="flex-shrink-0 mt-1 text-[10px] font-mono font-semibold tracking-wider uppercase px-3 py-2 rounded-[3px] transition-opacity hover:opacity-80 relative animate-pulse-container"
      style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'rgba(191,74,7,0.06)' }}
    >
      Netas →
      {!visited && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="satya-beacon-pulse-effect absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
        </span>
      )}
    </Link>
  )
}
