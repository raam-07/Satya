'use client'

import { useToast } from '@/lib/ToastContext'

export function Toast() {
  const { message } = useToast()
  if (!message) return null

  return (
    <div
      className="fixed bottom-20 left-1/2 z-[300] pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className="px-4 py-2.5 rounded-sm text-[12px] font-mono font-medium tracking-wide shadow-lg"
        style={{
          background: 'var(--text1)',
          color: '#fff',
          animation: 'fadeInUp 0.18s ease',
        }}
      >
        {message}
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
