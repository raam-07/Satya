'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ToastCtx {
  message: string | null
  showToast: (msg: string) => void
}

const ToastContext = createContext<ToastCtx>({ message: null, showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [timer, setTimer]     = useState<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    if (timer) clearTimeout(timer)
    setMessage(msg)
    const t = setTimeout(() => setMessage(null), 2800)
    setTimer(t)
  }, [timer])

  return (
    <ToastContext.Provider value={{ message, showToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
