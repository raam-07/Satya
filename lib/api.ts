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
  controversies?: {
    incident_text?: string
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
  promise?: string
  category?: string
  status?: 'kept' | 'broken' | 'ongoing' | 'void'
  made_on?: string
  deadline?: string
  source_url?: string
  source_description?: string
  archived_url?: string
  url_status?: 'ok' | 'dead'
  source_quality?: string
  supporting_quote?: string
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
    archived_url?: string
    url_status?: 'ok' | 'dead'
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
  by_person?: Record<string, any>
  by_party?: Record<string, any>
}

// ── manifest.json ────────────────────────────────────────────────────────────
export interface Manifest {
  generated_at?: string
  endpoints?: string[] | Record<string, unknown>
  stats?: Record<string, number>
}

// ── Client Fetch Helper ──────────────────────────────────────────────────────
async function fetchClientJSON<T>(type: string, param: string = ''): Promise<T | null> {
  try {
    // Determine absolute base URL if on server context (safeguard)
    const base = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') : '';
    const res = await fetch(`${base}/api/data?type=${type}&param=${encodeURIComponent(param)}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Hybrid API Wrapper (Sever direct connection, Client route proxy) ──
export const api = {
  async indiaOverview(): Promise<IndiaOverview | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.indiaOverview();
    }
    return fetchClientJSON<IndiaOverview>('indiaOverview');
  },

  async manifest(): Promise<Manifest | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.manifest();
    }
    return fetchClientJSON<Manifest>('manifest');
  },

  async party(name: string): Promise<PartyData | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.party(name);
    }
    return fetchClientJSON<PartyData>('party', name);
  },

  async minister(name: string): Promise<Minister | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.minister(name);
    }
    return fetchClientJSON<Minister>('minister', name);
  },

  async state(name: string): Promise<StateData | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.state(name);
    }
    return fetchClientJSON<StateData>('state', name);
  },

  async topic(name: string): Promise<TopicData | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.topic(name);
    }
    return fetchClientJSON<TopicData>('topic', name);
  },

  async promises(): Promise<PromisesSummary | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.promises();
    }
    return fetchClientJSON<PromisesSummary>('promises');
  },

  async category(name: string): Promise<{ articles?: Article[] } | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.category(name);
    }
    return fetchClientJSON<{ articles?: Article[] }>('category', name);
  },

  async feed(type: string): Promise<{ generated_at?: string; total?: number; articles?: Article[] } | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.feed(type);
    }
    return fetchClientJSON<{ generated_at?: string; total?: number; articles?: Article[] }>('feed', type);
  },

  async articleContent(id: number): Promise<{ content?: string } | null> {
    if (typeof window === 'undefined') {
      const { serverApi } = await import('./api.server');
      return serverApi.articleContent(id);
    }
    return fetchClientJSON<{ content?: string }>('articleContent', String(id));
  }
};
