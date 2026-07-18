'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/ToastContext'
import { event } from '@/lib/gtag'

interface HardRefreshButtonProps {
  secret?: string
}

export function HardRefreshButton({ secret }: HardRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Admin gate read on the CLIENT, so it works even though the page is
  // statically cached (server searchParams are empty in that case).
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    setIsAdmin(new URLSearchParams(window.location.search).get('admin') === 'true')
  }, [])
  const router = useRouter()
  const { showToast } = useToast()

  const handleRefresh = async () => {
    if (isRefreshing) return

    let activeSecret = secret
    if (!activeSecret) {
      activeSecret = prompt('Enter Admin Revalidation Secret to clear server cache:') || undefined
      if (!activeSecret) return
    }

    setIsRefreshing(true)
    showToast('Clearing server cache...')
    
    try {
      const res = await fetch(`/api/data?type=refresh&secret=${encodeURIComponent(activeSecret)}&t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      })
      
      if (res.ok) {
        // Track the cache bypass custom event
        event({
          action: 'hard_refresh',
          category: 'engagement',
          label: 'Cache Bypass Triggered'
        })

        showToast('Cache cleared! Fetching fresh data...')
        
        // Trigger Next.js router refresh to load fresh Server Component data
        router.refresh()
        
        // Wait briefly for the router refresh to complete
        setTimeout(() => {
          setIsRefreshing(false)
          showToast('Data updated successfully!')
        }, 1200)
      } else {
        showToast('Failed to clear server cache.')
        setIsRefreshing(false)
      }
    } catch (err) {
      showToast('Error refreshing data.')
      setIsRefreshing(false)
    }
  }

  // Hidden for normal visitors; appears only with ?admin=true (client-checked).
  if (!isAdmin) return null

  return (
    <>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-sm font-mono text-[11px] font-semibold tracking-wider uppercase transition-all duration-200 select-none
          ${isRefreshing
            ? 'bg-[var(--bg-alt)] border-[var(--border)] text-[var(--text3)] cursor-not-allowed'
            : 'bg-[var(--surface)] border-[var(--border-md)] text-[var(--text2)] hover:text-[var(--accent)] hover:border-[var(--accent)] active:scale-95 cursor-pointer shadow-sm hover:shadow-md'
          }`}
      >
        <span className={`text-[12px] ${isRefreshing ? 'spin-icon' : ''}`} style={{ display: 'inline-block' }}>↻</span>
        {isRefreshing ? 'Refreshing...' : 'Hard Refresh'}
      </button>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 0.8s linear infinite; }
      `}</style>
    </>
  )
}
