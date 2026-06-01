const BASE = 'https://raw.githubusercontent.com/raam-07/Satya-API/main/api'

// ── Article (same shape everywhere) ─────────────────────────────────────────
export interface Article {
  id: number
  title: string
  url: string
  source: string
  image_url?: string
  scraped_at?: string
  category?: string
  sentiment?: string
  sentiment_target?: string
  rephrased_article?: string
  content?: string
  party_mentioned?: string[]
  ministers_mentioned?: string[]
  states_mentioned?: string[]
  cities_mentioned?: string[]
  topic_tags?: string[]
  is_india?: boolean
  civic_flag?: boolean
  civic_flag_score?: number
  civic_flag_category?: string
  civic_flag_reason?: string
}

// ── india_overview.json ──────────────────────────────────────────────────────
export interface IndiaOverview {
  generated_at?: string
  current_government?: {
    ruling_party?: string
    ruling_coalition?: string
    prime_minister?: string
    president?: string
  }
  stats?: {
    total_articles_classified?: number
    articles_last_7_days?: number
    articles_last_30_days?: number
    civic_flags_last_30_days?: number
    civic_flags_today?: number
  }
  civic_alert?: {
    flagged_count_30d?: number
    flagged_today?: number
    top_flag_categories?: Record<string, number>
  }
  top_stories?: Article[]
  category_breakdown_30d?: Record<string, number>
  top_ministers_30d?: Record<string, number>
  top_parties_30d?: Record<string, number>
  top_states_30d?: Record<string, number>
}

// ── party_*.json ─────────────────────────────────────────────────────────────
export interface PartyMinister {
  name?: string
  role?: string
  state?: string
  criminal_cases?: number
  criminal_cases_in_news?: number
}

export interface PartyPromise {
  id?: string
  person?: string
  promise?: string
  status?: 'kept' | 'broken' | 'ongoing' | 'void'
  category?: string
}

export interface PartyData {
  generated_at?: string
  party?: string
  full_name?: string
  ideology?: string
  president?: string
  coalition?: string
  ruling_states?: string[]
  color?: string
  stats?: Record<string, number>
  ministers?: PartyMinister[]
  promises?: PartyPromise[]
  recent_articles?: Article[]
}

// ── minister_*.json ──────────────────────────────────────────────────────────
export interface MinisterPromise {
  id?: string
  promise?: string
  status?: 'kept' | 'broken' | 'ongoing' | 'void'
  made_on?: string
  evidence_count?: number
}

export interface Minister {
  generated_at?: string
  name?: string
  role?: string
  ministry?: string
  party?: string
  state?: string
  constituency?: string
  criminal_cases?: number
  criminal_cases_in_news?: number
  criminal_incidents?: {
    incident_text?: string
    incident_type?: string
    source_url?: string
    source_title?: string
    scraped_at?: string
  }[]
  wikipedia?: string
  affidavit_url?: string
  stats?: Record<string, number>
  promises?: MinisterPromise[]
  recent_articles?: Article[]
}

// ── state_*.json ─────────────────────────────────────────────────────────────
export interface StateData {
  generated_at?: string
  state?: string
  capital?: string
  ruling_party?: string
  cm?: string
  region?: string
  stats?: { total_articles?: number; articles_last_30d?: number }
  top_topics_30d?: Record<string, number>
  top_cities_30d?: Record<string, number>
  recent_articles?: Article[]
}

// ── topic_*.json ─────────────────────────────────────────────────────────────
export interface TopicData {
  generated_at?: string
  topic?: string
  stats?: { total_articles?: number; articles_last_30d?: number }
  recent_articles?: Article[]
}

// ── promises_summary.json ────────────────────────────────────────────────────
export interface PoliticalPromise {
  id?: string
  person?: string
  party?: string
  promise?: string          // NOTE: field is "promise" not "text"
  category?: string
  status?: 'kept' | 'broken' | 'ongoing' | 'void'
  made_on?: string
  deadline?: string
  evidence_count?: number
  gemma_suggestion?: string
  gemma_reasoning?: string
  evidence_articles?: {
    url: string
    title: string
    source: string
    scraped_at: string
    relevance_score?: number
    gemma_validated?: boolean
    rephrased?: string
    content?: string
  }[]
}

export interface PromisesSummary {
  generated_at?: string
  stats?: {
    total_promises?: number
    kept?: number
    broken?: number
    ongoing?: number
    void?: number
  }
  by_status?: {
    broken?: PoliticalPromise[]
    ongoing?: PoliticalPromise[]
    kept?: PoliticalPromise[]
    void?: PoliticalPromise[]
  }
  by_person?: Record<string, number>
  by_party?: Record<string, number>
}

// ── manifest.json ────────────────────────────────────────────────────────────
export interface Manifest {
  generated_at?: string
  // Can be a string[] (legacy) or a nested object { parties: {...}, ministers: {...}, states: {...} }
  endpoints?: string[] | Record<string, unknown>
  stats?: Record<string, number>
}

// ── Fetch helper ─────────────────────────────────────────────────────────────
async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    // Bust GitHub CDN and browser cache by appending a minute-based timestamp
    const cacheBuster = Math.floor(Date.now() / 60000)
    const url = `${BASE}/${path}?t=${cacheBuster}`

    const res = await fetch(url, {
      next: { revalidate: 60 } // Revalidate cache every 60 seconds (Incremental Static Regeneration)
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export const api = {
  indiaOverview: () => fetchJSON<IndiaOverview>('india_overview.json'),
  manifest:      () => fetchJSON<Manifest>('manifest.json'),
  party:         (name: string) => fetchJSON<PartyData>(`party_${name}.json`),
  minister:      (name: string) => fetchJSON<Minister>(`minister_${name}.json`),
  state:         (name: string) => fetchJSON<StateData>(`state_${name}.json`),
  topic:         (name: string) => fetchJSON<TopicData>(`topic_${name}.json`),
  promises:      () => fetchJSON<PromisesSummary>('promises_summary.json'),
  category:      (name: string) => fetchJSON<{ articles?: Article[] }>(`category_${name}.json`),
  feed: (type: string) => {
    const files: Record<string, string> = {
      all:           'feed.json',
      flagged:       'feed_flagged.json',
      politics:      'feed_politics.json',
      governance:    'feed_politics.json',
      crime:         'feed_crime.json',
      justice:       'feed_crime.json',
      economy:       'feed_economy.json',
      international: 'feed_international.json',
      world:         'feed_international.json',
      health:        'feed_health.json',
      corruption:    'feed_topic_corruption.json',
      farmers:       'feed_topic_farmers.json',
    }
    const file = files[type] ?? 'feed.json'
    return fetchJSON<{ generated_at?: string; total?: number; articles?: Article[] }>(file)
  }
}
