'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from './api'

interface ManifestCtx {
  parties:   Set<string>   // slugs: 'bjp', 'inc', 'aap'
  ministers: Set<string>   // slugs: 'narendra_modi', 'amit_shah'
  states:    Set<string>   // slugs: 'delhi', 'kerala'
  loaded:    boolean
  // slug helpers
  partySlug:    (name: string) => string
  ministerSlug: (name: string) => string
  stateSlug:    (name: string) => string
  // checkers
  hasParty:    (name: string) => boolean
  hasMinister: (name: string) => boolean
  hasState:    (name: string) => boolean
}

const noop = () => ''
const defaults: ManifestCtx = {
  parties: new Set(), ministers: new Set(), states: new Set(), loaded: false,
  partySlug: noop, ministerSlug: noop, stateSlug: noop,
  hasParty: () => false, hasMinister: () => false, hasState: () => false,
}

const ManifestContext = createContext<ManifestCtx>(defaults)

export function ManifestProvider({ children }: { children: ReactNode }) {
  const [parties,   setParties]   = useState<Set<string>>(new Set())
  const [ministers, setMinisters] = useState<Set<string>>(new Set())
  const [states,    setStates]    = useState<Set<string>>(new Set())
  const [loaded,    setLoaded]    = useState(false)

  useEffect(() => {
    api.manifest().then(m => {
      if (!m?.endpoints) { setLoaded(true); return }
      const ps = new Set<string>()
      const ms = new Set<string>()
      const ss = new Set<string>()
      for (const e of m.endpoints) {
        if (e.startsWith('party_'))    ps.add(e.replace('party_', '').replace('.json', ''))
        if (e.startsWith('minister_')) ms.add(e.replace('minister_', '').replace('.json', ''))
        if (e.startsWith('state_'))    ss.add(e.replace('state_', '').replace('.json', ''))
      }
      setParties(ps); setMinisters(ms); setStates(ss); setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const partySlug    = (n: string) => n.toLowerCase().replace(/\s+/g, '_')
  const ministerSlug = (n: string) => n.toLowerCase().replace(/\s+/g, '_')
  const stateSlug    = (n: string) => n.toLowerCase().replace(/\s+/g, '_')

  return (
    <ManifestContext.Provider value={{
      parties, ministers, states, loaded,
      partySlug, ministerSlug, stateSlug,
      hasParty:    n => parties.has(partySlug(n)),
      hasMinister: n => ministers.has(ministerSlug(n)),
      hasState:    n => states.has(stateSlug(n)),
    }}>
      {children}
    </ManifestContext.Provider>
  )
}

export const useManifest = () => useContext(ManifestContext)
