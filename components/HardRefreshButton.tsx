'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/ToastContext'
import { event } from '@/lib/gtag'

interface HardRefreshButtonProps {
  secret?: string
}

export function HardRefreshButton({ secret }: HardRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
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

  return null;
}
