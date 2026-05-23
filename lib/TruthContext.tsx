'use client'

import React, { createContext, useContext, useState } from 'react'

interface TruthContextProps {
  truthMode: boolean
  setTruthMode: (mode: boolean) => void
}

const TruthContext = createContext<TruthContextProps | undefined>(undefined)

export function TruthProvider({ children }: { children: React.ReactNode }) {
  const [truthMode, setTruthMode] = useState(false)

  return (
    <TruthContext.Provider value={{ truthMode, setTruthMode }}>
      {children}
    </TruthContext.Provider>
  )
}

export function useTruth() {
  const context = useContext(TruthContext)
  if (!context) {
    throw new Error('useTruth must be used within a TruthProvider')
  }
  return context
}
