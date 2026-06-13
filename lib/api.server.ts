import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { db } from './db';
import type { 
  Article, 
  IndiaOverview, 
  PartyData, 
  Minister, 
  StateData, 
  TopicData, 
  PromisesSummary, 
  Manifest 
} from './api';

// --- Static Registries Loaders (Self-Healing Paths) ---
async function loadEntities(): Promise<any> {
  const localPath = path.join(process.cwd(), '../satya-entity-library/entities.json');
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    } catch {}
  }
  try {
    const res = await fetch('https://raw.githubusercontent.com/raam-07/satya-entity-library/main/entities.json', {
      next: { revalidate: 900 }
    });
    return await res.json();
  } catch {
    return null;
  }
}

async function loadPromisesRegistry(): Promise<any> {
  const localPath = path.join(process.cwd(), '../Satya-promise-tracker/promises.json');
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    } catch {}
  }
  try {
    const res = await fetch('https://raw.githubusercontent.com/raam-07/Satya-promise-tracker/main/promises.json', {
      next: { revalidate: 900 }
    });
    return await res.json();
  } catch {
    return null;
  }
}

// --- Zlib Decompression Helper ---
function decompressText(blob: any): string {
  if (!blob) return '';
  try {
    let buffer: Buffer;
    if (blob instanceof Buffer) {
      buffer = blob;
    } else if (blob instanceof Uint8Array) {
      buffer = Buffer.from(blob);
    } else if (typeof blob === 'object' && blob.data) {
      // Handle json serialization format for buffers
      buffer = Buffer.from(blob.data);
    } else {
      buffer = Buffer.from(blob);
    }
    return zlib.inflateSync(buffer).toString('utf-8');
  } catch (e) {
    return '';
  }
}

// --- Map DB row to Article object ---
function mapRowToArticle(row: any): Article {
  const party_mentioned = row.party_mentioned ? JSON.parse(row.party_mentioned) : [];
  const ministers_mentioned = row.ministers_mentioned ? JSON.parse(row.ministers_mentioned) : [];
  const states_mentioned = row.states_mentioned ? JSON.parse(row.states_mentioned) : [];
  const cities_mentioned = row.cities_mentioned ? JSON.parse(row.cities_mentioned) : [];
  const topic_tags = row.topic_tags ? JSON.parse(row.topic_tags) : [];

  const content = decompressText(row.content);
  const rephrased = decompressText(row.rephrased_article);

  let scraped_at_str = '';
  if (row.scraped_at) {
    try {
      scraped_at_str = new Date(row.scraped_at * 1000).toISOString().replace('T', ' ').substring(0, 19);
    } catch {}
  }

  return {
    id: Number(row.id),
    title: row.title || '',
    url: row.url || '',
    source: row.source_name || '',
    image_url: row.image_url || undefined,
    scraped_at: scraped_at_str || undefined,
    category: row.category || undefined,
    sentiment: row.sentiment || undefined,
    sentiment_target: row.sentiment_target || undefined,
    rephrased_article: rephrased || content || undefined,
    content: content || undefined,
    party_mentioned,
    ministers_mentioned,
    states_mentioned,
    cities_mentioned,
    topic_tags,
    is_india: true, // Will set below if international
    civic_flag: row.civic_flag === 1,
    civic_flag_score: row.civic_flag_score || undefined,
    civic_flag_category: row.civic_flag_category || undefined,
    civic_flag_reason: row.civic_flag_reason || undefined
  };
}

// --- In-Memory TTL Cache (15 minutes) ---
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Return cached result if still fresh
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }

  // Deduplicate concurrent requests for the same key
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fn().then(result => {
    if (result !== null && result !== undefined) {
      cache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    inflight.delete(key);
    return result;
  }).catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

export function clearCache() {
  cache.clear();
  inflight.clear();
}

export const serverApi = {
  async indiaOverview(): Promise<IndiaOverview | null> {
    return cached('indiaOverview', async () => {
      const entities = await loadEntities();
      const promises = await loadPromisesRegistry();
      if (!entities) return null;

      const pm = entities.india?.central_government?.prime_minister || '';
      const pres = entities.india?.central_government?.president || '';
      const ruling_party = entities.india?.central_government?.ruling_party || '';
      const ruling_coalition = entities.india?.central_government?.ruling_coalition || '';

      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 3600);
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

      const [
        totalRes,
        last7dRes,
        last30dRes,
        flagged30dRes,
        flaggedTodayRes,
        storiesRes,
        catBreakdownRes,
        flagCatsRes,
        ministerRes,
        partyRes,
        stateRes
      ] = await db.batch([
        "SELECT COUNT(*) as c FROM articles WHERE status IN ('classified', 'entity_processed', 'processed')",
        {
          sql: "SELECT COUNT(*) as c FROM articles WHERE status IN ('classified', 'entity_processed', 'processed') AND scraped_at >= ?",
          args: [sevenDaysAgo]
        },
        {
          sql: "SELECT COUNT(*) as c FROM articles WHERE status IN ('classified', 'entity_processed', 'processed') AND scraped_at >= ?",
          args: [thirtyDaysAgo]
        },
        {
          sql: "SELECT COUNT(*) as c FROM articles WHERE status IN ('classified', 'entity_processed', 'processed') AND civic_flag = 1 AND scraped_at >= ?",
          args: [thirtyDaysAgo]
        },
        {
          sql: "SELECT COUNT(*) as c FROM articles WHERE status IN ('classified', 'entity_processed', 'processed') AND civic_flag = 1 AND scraped_at >= ?",
          args: [todayStart]
        },
        {
          sql: `SELECT a.id, a.title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target,
                       a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
                FROM articles a
                LEFT JOIN sources s ON a.source_id = s.id
                WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.category IN ('politics', 'economy', 'crime', 'international')
                ORDER BY a.scraped_at DESC LIMIT 10`,
          args: []
        },
        {
          sql: `SELECT category, COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND scraped_at >= ?
                GROUP BY category`,
          args: [thirtyDaysAgo]
        },
        {
          sql: `SELECT civic_flag_category, COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND civic_flag = 1 AND scraped_at >= ?
                GROUP BY civic_flag_category`,
          args: [thirtyDaysAgo]
        },
        {
          sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.ministers_mentioned) j
                WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.scraped_at >= ?
                GROUP BY j.value ORDER BY c DESC LIMIT 20`,
          args: [thirtyDaysAgo]
        },
        {
          sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.party_mentioned) j
                WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.scraped_at >= ?
                GROUP BY j.value ORDER BY c DESC LIMIT 10`,
          args: [thirtyDaysAgo]
        },
        {
          sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.states_mentioned) j
                WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.scraped_at >= ?
                GROUP BY j.value ORDER BY c DESC LIMIT 10`,
          args: [thirtyDaysAgo]
        }
      ]);

      const total = Number(totalRes.rows[0]?.c || 0);
      const last7d = Number(last7dRes.rows[0]?.c || 0);
      const last30d = Number(last30dRes.rows[0]?.c || 0);
      const flagged30d = Number(flagged30dRes.rows[0]?.c || 0);
      const flaggedToday = Number(flaggedTodayRes.rows[0]?.c || 0);

      const topStories = storiesRes.rows.map(row => mapRowToArticle(row));

      const category_breakdown_30d: Record<string, number> = {};
      catBreakdownRes.rows.forEach(r => {
        if (r.category) category_breakdown_30d[String(r.category)] = Number(r.c);
      });

      const top_flag_categories: Record<string, number> = {};
      flagCatsRes.rows.forEach(r => {
        if (r.civic_flag_category) top_flag_categories[String(r.civic_flag_category)] = Number(r.c);
      });

      const top_ministers_30d: Record<string, number> = {};
      ministerRes.rows.forEach(r => { top_ministers_30d[String(r.val)] = Number(r.c); });

      const top_parties_30d: Record<string, number> = {};
      partyRes.rows.forEach(r => { top_parties_30d[String(r.val)] = Number(r.c); });

      const top_states_30d: Record<string, number> = {};
      stateRes.rows.forEach(r => { top_states_30d[String(r.val)] = Number(r.c); });

      return {
        generated_at: new Date().toISOString(),
        current_government: {
          ruling_party,
          ruling_coalition,
          prime_minister: pm,
          president: pres
        },
        stats: {
          total_articles_classified: total,
          articles_last_7_days: last7d,
          articles_last_30_days: last30d,
          civic_flags_last_30_days: flagged30d,
          civic_flags_today: flaggedToday
        },
        civic_alert: {
          flagged_count_30d: flagged30d,
          flagged_today: flaggedToday,
          top_flag_categories
        },
        top_stories: topStories,
        category_breakdown_30d,
        top_ministers_30d,
        top_parties_30d,
        top_states_30d
      };
    });
  },

  async manifest(): Promise<Manifest | null> {
    return cached('manifest', async () => {
      const entities = await loadEntities();
      if (!entities) return null;

      const parties = (entities.india?.parties || []).map((p: any) => p.name);
      const states = (entities.india?.states || []).map((s: any) => s.name);
      const ministers = [
        ...(entities.india?.cabinet_ministers || []),
        ...(entities.india?.state_chief_ministers || []),
        ...(entities.india?.opposition_leaders || [])
      ].map((m: any) => m.name);

      return {
        generated_at: new Date().toISOString(),
        endpoints: {
          feed: "feed.json",
          feed_flagged: "feed_flagged.json",
          feed_politics: "feed_politics.json",
          feed_crime: "feed_crime.json",
          feed_economy: "feed_economy.json",
          feed_international: "feed_international.json",
          feed_health: "feed_health.json",
          feed_corruption: "feed_topic_corruption.json",
          feed_farmers: "feed_topic_farmers.json",
          india_overview: "india_overview.json"
        },
        stats: {
          parties_count: parties.length,
          states_count: states.length,
          ministers_count: ministers.length,
          topics_count: 5
        }
      };
    });
  },

  async party(name: string): Promise<PartyData | null> {
    return cached(`party:${name.toLowerCase()}`, async () => {
      const entities = await loadEntities();
      const promises = await loadPromisesRegistry();
      if (!entities) return null;

      const partyInfo = (entities.india?.parties || []).find((p: any) => p.name.toLowerCase() === name.toLowerCase() || p.aliases?.some((a: string) => a.toLowerCase() === name.toLowerCase()));
      if (!partyInfo) return null;

      const partyName = partyInfo.name;

      // Fetch articles
      const articlesRes = await db.execute({
        sql: `SELECT a.id, a.title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.party_mentioned LIKE ?
              ORDER BY a.scraped_at DESC LIMIT 100`,
        args: [`%${partyName}%`]
      });
      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));

      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);
      const sentimentRes = await db.execute({
        sql: `SELECT sentiment, COUNT(*) as c FROM articles 
              WHERE status IN ('classified', 'entity_processed', 'processed') AND party_mentioned LIKE ? AND scraped_at >= ?
              GROUP BY sentiment`,
        args: [`%${partyName}%`, thirtyDaysAgo]
      });
      const sentimentStats: Record<string, number> = {};
      sentimentRes.rows.forEach(r => {
        if (r.sentiment) sentimentStats[String(r.sentiment)] = Number(r.c);
      });

      // Filter ministers
      const ministers = [
        ...(entities.india?.cabinet_ministers || []),
        ...(entities.india?.state_chief_ministers || []),
        ...(entities.india?.opposition_leaders || [])
      ]
        .filter((m: any) => m.party === partyName)
        .map((m: any) => ({
          name: m.name,
          role: m.role || '',
          state: m.state || '',
          criminal_cases: m.criminal_cases || 0,
          criminal_cases_in_news: m.criminal_cases_in_news || 0
        }));

      // Filter promises
      const partyPromises = (promises?.promises || [])
        .filter((p: any) => p.party === partyName)
        .map((p: any) => ({
          id: p.id,
          person: p.person,
          promise: p.promise,
          status: p.status,
          category: p.category || ''
        }));

      return {
        generated_at: new Date().toISOString(),
        party: partyName,
        full_name: partyInfo.full_name || '',
        ideology: partyInfo.ideology || '',
        president: partyInfo.president || '',
        coalition: partyInfo.coalition || '',
        ruling_states: partyInfo.ruling_states || [],
        color: partyInfo.color || '',
        stats: {
          total_articles: recent_articles.length,
          articles_last_30d: recent_articles.filter(a => a.scraped_at && new Date(a.scraped_at).getTime() >= thirtyDaysAgo * 1000).length
        },
        ministers,
        promises: partyPromises,
        recent_articles
      };
    });
  },

  async minister(name: string): Promise<Minister | null> {
    return cached(`minister:${name.toLowerCase()}`, async () => {
      const entities = await loadEntities();
      const promises = await loadPromisesRegistry();
      if (!entities) return null;

      const allMinisters = [
        ...(entities.india?.cabinet_ministers || []),
        ...(entities.india?.state_chief_ministers || []),
        ...(entities.india?.opposition_leaders || []),
        ...(entities.india?.generic_politicians || [])
      ];

      const ministerInfo = allMinisters.find((m: any) => m.name.toLowerCase() === name.toLowerCase() || m.aliases?.some((a: string) => a.toLowerCase() === name.toLowerCase()));
      if (!ministerInfo) return null;

      const canonicalName = ministerInfo.name;

      // Fetch articles
      const articlesRes = await db.execute({
        sql: `SELECT a.id, a.title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.ministers_mentioned LIKE ?
              ORDER BY a.scraped_at DESC LIMIT 100`,
        args: [`%${canonicalName}%`]
      });
      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));

      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);
      const sentimentRes = await db.execute({
        sql: `SELECT sentiment, COUNT(*) as c FROM articles 
              WHERE status IN ('classified', 'entity_processed', 'processed') AND ministers_mentioned LIKE ? AND scraped_at >= ?
              GROUP BY sentiment`,
        args: [`%${canonicalName}%`, thirtyDaysAgo]
      });
      const sentimentStats: Record<string, number> = {};
      sentimentRes.rows.forEach(r => {
        if (r.sentiment) sentimentStats[String(r.sentiment)] = Number(r.c);
      });

      // Filter promises
      const ministerPromises = (promises?.promises || [])
        .filter((p: any) => p.person === canonicalName)
        .map((p: any) => ({
          id: p.id,
          promise: p.promise,
          status: p.status,
          made_on: p.made_on || p.created_at || '',
          evidence_count: p.evidence_articles?.length || 0
        }));

      return {
        generated_at: new Date().toISOString(),
        name: canonicalName,
        role: ministerInfo.role || '',
        ministry: ministerInfo.ministry || '',
        party: ministerInfo.party || '',
        state: ministerInfo.state || '',
        constituency: ministerInfo.constituency || '',
        criminal_cases: ministerInfo.criminal_cases || 0,
        criminal_cases_in_news: ministerInfo.criminal_cases_in_news || 0,
        criminal_incidents: ministerInfo.criminal_incidents || [],
        controversies: ministerInfo.controversies || [],
        wikipedia: ministerInfo.wikipedia || '',
        affidavit_url: ministerInfo.affidavit_url || '',
        stats: {
          total_articles: recent_articles.length,
          articles_last_30d: recent_articles.filter(a => a.scraped_at && new Date(a.scraped_at).getTime() >= thirtyDaysAgo * 1000).length
        },
        promises: ministerPromises,
        recent_articles
      };
    });
  },

  async state(name: string): Promise<StateData | null> {
    return cached(`state:${name.toLowerCase()}`, async () => {
      const entities = await loadEntities();
      if (!entities) return null;

      const stateInfo = (entities.india?.states || []).find((s: any) => s.name.toLowerCase() === name.toLowerCase() || s.aliases?.some((a: string) => a.toLowerCase() === name.toLowerCase()));
      if (!stateInfo) return null;

      const stateName = stateInfo.name;

      // Fetch articles
      const articlesRes = await db.execute({
        sql: `SELECT a.id, a.title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.states_mentioned LIKE ?
              ORDER BY a.scraped_at DESC LIMIT 100`,
        args: [`%${stateName}%`]
      });
      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));

      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

      // Top cities
      const cityRes = await db.execute({
        sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.cities_mentioned) j
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.states_mentioned LIKE ? AND a.scraped_at >= ?
              GROUP BY j.value ORDER BY c DESC LIMIT 10`,
        args: [`%${stateName}%`, thirtyDaysAgo]
      });
      const top_cities_30d: Record<string, number> = {};
      cityRes.rows.forEach(r => { top_cities_30d[String(r.val)] = Number(r.c); });

      // Top topics
      const topicRes = await db.execute({
        sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.topic_tags) j
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.states_mentioned LIKE ? AND a.scraped_at >= ?
              GROUP BY j.value ORDER BY c DESC LIMIT 10`,
        args: [`%${stateName}%`, thirtyDaysAgo]
      });
      const top_topics_30d: Record<string, number> = {};
      topicRes.rows.forEach(r => { top_topics_30d[String(r.val)] = Number(r.c); });

      return {
        generated_at: new Date().toISOString(),
        state: stateName,
        capital: stateInfo.capital || '',
        ruling_party: stateInfo.ruling_party || '',
        cm: stateInfo.cm || '',
        region: stateInfo.region || '',
        stats: {
          total_articles: recent_articles.length,
          articles_last_30d: recent_articles.filter(a => a.scraped_at && new Date(a.scraped_at).getTime() >= thirtyDaysAgo * 1000).length
        },
        top_cities_30d,
        top_topics_30d,
        recent_articles
      };
    });
  },

  async topic(name: string): Promise<TopicData | null> {
    return cached(`topic:${name.toLowerCase()}`, async () => {
      const articlesRes = await db.execute({
        sql: `SELECT a.id, a.title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.topic_tags LIKE ?
              ORDER BY a.scraped_at DESC LIMIT 100`,
        args: [`%${name}%`]
      });
      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

      return {
        generated_at: new Date().toISOString(),
        topic: name,
        stats: {
          total_articles: recent_articles.length,
          articles_last_30d: recent_articles.filter(a => a.scraped_at && new Date(a.scraped_at).getTime() >= thirtyDaysAgo * 1000).length
        },
        recent_articles
      };
    });
  },

  async category(name: string): Promise<{ articles?: Article[] } | null> {
    return cached(`category:${name.toLowerCase()}`, async () => {
      const articlesRes = await db.execute({
        sql: `SELECT a.id, a.title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.category = ?
              ORDER BY a.scraped_at DESC LIMIT 100`,
        args: [name]
      });
      const articles = articlesRes.rows.map(row => mapRowToArticle(row));
      return { articles };
    });
  },

  async promises(): Promise<PromisesSummary | null> {
    return cached('promises', async () => {
      const registry = await loadPromisesRegistry();
      if (!registry) return null;

      const byStatus: Record<string, any[]> = { kept: [], broken: [], ongoing: [], void: [] };
      const byPerson: Record<string, any[]> = {};
      const byParty: Record<string, any[]> = {};

      for (const p of (registry.promises || [])) {
        const status = p.status || 'ongoing';
        const person = p.person || '';
        const party = p.party || '';

        const light = {
          id: p.id,
          person,
          party,
          promise: p.promise,
          category: p.category || '',
          status,
          made_on: p.made_on || p.created_at || '',
          deadline: p.deadline || '',
          archived_url: p.archived_url,
          url_status: p.url_status,
          source_quality: p.source_quality,
          supporting_quote: p.supporting_quote,
          evidence_count: p.evidence_articles?.length || 0,
          evidence_articles: p.evidence_articles || [],
          gemma_suggestion: p.gemma_suggestion,
          gemma_reasoning: p.gemma_reasoning
        };

        if (byStatus[status]) byStatus[status].push(light);
        else byStatus[status] = [light];

        if (person) {
          if (!byPerson[person]) byPerson[person] = [];
          byPerson[person].push(light);
        }

        if (party) {
          if (!byParty[party]) byParty[party] = [];
          byParty[party].push(light);
        }
      }

      return {
        generated_at: new Date().toISOString(),
        stats: {
          total_promises: (registry.promises || []).length,
          kept: byStatus.kept.length,
          broken: byStatus.broken.length,
          ongoing: byStatus.ongoing.length,
          void: byStatus.void.length
        },
        by_status: byStatus as any,
        by_person: byPerson,
        by_party: byParty
      };
    });
  },

  async feed(type: string): Promise<{ generated_at?: string; total?: number; articles?: Article[] } | null> {
    return cached(`feed:${type.toLowerCase()}`, async () => {
      let query = `
        SELECT a.id, a.title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
               a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
        FROM articles a
        LEFT JOIN sources s ON a.source_id = s.id
        WHERE a.status IN ('classified', 'entity_processed', 'processed')
      `;
      let args: any[] = [];

      const category_map: Record<string, string> = {
        politics: 'politics',
        governance: 'politics',
        crime: 'crime',
        justice: 'crime',
        economy: 'economy',
        international: 'international',
        world: 'international',
        health: 'health',
        education: 'education'
      };

      const topic_map: Record<string, string> = {
        corruption: 'corruption_scam',
        farmers: 'farmer_agriculture'
      };

      if (type === 'flagged') {
        query += " AND a.civic_flag = 1 ORDER BY a.civic_flag_score DESC, a.scraped_at DESC LIMIT 200";
      } else if (category_map[type]) {
        query += " AND a.category = ? ORDER BY a.scraped_at DESC LIMIT 200";
        args.push(category_map[type]);
      } else if (topic_map[type]) {
        query += " AND a.topic_tags LIKE ? ORDER BY a.scraped_at DESC LIMIT 200";
        args.push(`%${topic_map[type]}%`);
      } else {
        // 'all' feed
        query += " ORDER BY a.scraped_at DESC LIMIT 200";
      }

      const res = await db.execute({ sql: query, args });
      const articles = res.rows.map(row => mapRowToArticle(row));

      return {
        generated_at: new Date().toISOString(),
        total: articles.length,
        articles
      };
    });
  },

  async articleContent(id: number): Promise<{ content?: string } | null> {
    return cached(`articleContent:${id}`, async () => {
      const res = await db.execute({
        sql: 'SELECT content FROM articles WHERE id = ?',
        args: [id]
      });
      if (!res.rows.length) return null;
      const content = decompressText(res.rows[0].content);
      return { content: content || undefined };
    });
  }
};
