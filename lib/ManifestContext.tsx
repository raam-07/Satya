'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from './api'
import { slugify, partySlugify } from './utils'

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

      // Manifest uses nested objects: endpoints.parties, endpoints.ministers, endpoints.states
      // Each value is a filename like "party_bjp.json" → slug "bjp"
      const endpoints = m.endpoints as unknown as Record<string, unknown>

      const parties   = endpoints['parties']   as Record<string, string> | undefined
      const ministers = endpoints['ministers'] as Record<string, string> | undefined
      const states    = endpoints['states']    as Record<string, string> | undefined

      if (parties)   Object.values(parties).forEach(f   => ps.add(f.replace('party_', '').replace('.json', '')))
      if (ministers) Object.values(ministers).forEach(f => ms.add(f.replace('minister_', '').replace('.json', '')))
      if (states)    Object.values(states).forEach(f    => ss.add(f.replace('state_', '').replace('.json', '')))

      // Fallback: if endpoints is still a plain array of filenames
      if (Array.isArray(m.endpoints)) {
        for (const e of m.endpoints as string[]) {
          if (e.startsWith('party_'))    ps.add(e.replace('party_', '').replace('.json', ''))
          if (e.startsWith('minister_')) ms.add(e.replace('minister_', '').replace('.json', ''))
          if (e.startsWith('state_'))    ss.add(e.replace('state_', '').replace('.json', ''))
        }
      }

      setParties(ps); setMinisters(ms); setStates(ss); setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  // Shared slugify keeps these consistent with the aggregator's filenames
  // (dots stripped: 'M.K. Stalin' → 'mk_stalin')
  const partySlug    = (n: string) => partySlugify(n)
  const ministerSlug = (n: string) => slugify(n)
  const stateSlug    = (n: string) => slugify(n)

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
