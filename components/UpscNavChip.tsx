'use client'
import { useRouter } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'

interface UpscNavChipProps {
  to: string
  active: boolean
  children: React.ReactNode
}

export function UpscNavChip({ to, active, children }: UpscNavChipProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticActive, setOptimisticActive] = useState(active)

  useEffect(() => {
    setOptimisticActive(active)
  }, [active])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (active) return
    setOptimisticActive(true)
    startTransition(() => {
      router.push(to, { scroll: false })
    })
  }

  const isCurrentActive = optimisticActive || isPending

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending && active}
      className={`text-[12px] px-2.5 py-1 rounded-md border transition-all whitespace-nowrap select-none cursor-pointer flex items-center gap-1.5 ${
        isCurrentActive
          ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
          : 'bg-[var(--surface)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hi)]'
      } ${isPending ? 'opacity-85 scale-[0.98]' : 'active:scale-95'}`}
    >
      <span>{children}</span>
      {isPending && !active && (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
      )}
    </button>
  )
}
