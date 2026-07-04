import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { db } from './db';
import { slugify, partySlugify } from './utils';
import { unstable_cache, revalidateTag, revalidatePath } from 'next/cache';
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

function getAllPoliticians(entities: any): any[] {
  if (!entities?.india) return [];
  return [
    ...(entities.india.cabinet_ministers || []),
    ...(entities.india.state_chief_ministers || []),
    ...(entities.india.opposition_leaders || []),
    ...(entities.india.generic_politicians || [])
  ];
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
    rephrased_title: row.rephrased_title || undefined,
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
    civic_flag_reason: row.civic_flag_reason || undefined,
    url_status: row.url_status || undefined,
    archived_url: row.archived_url || undefined,
    archive_source: row.archive_source || undefined,
    search_fallback_url: row.search_fallback_url || undefined,
    supporting_quote: row.supporting_quote || undefined
  };
}

// --- Next.js unstable_cache & In-Memory Request Deduplication ---
const inflight = new Map<string, Promise<any>>();

async function cached<T>(
  key: string,
  tags: string[],
  fn: () => Promise<T>,
  options?: { revalidate?: number }
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    return unstable_cache(
      async () => {
        return fn();
      },
      [key],
      { tags, revalidate: options?.revalidate }
    )();
  })();

  inflight.set(key, promise);
  try {
    const res = await promise;
    inflight.delete(key);
    return res;
  } catch (err) {
    inflight.delete(key);
    throw err;
  }
}

const globalRef = global as any;
if (typeof globalRef.lastRevalidatedAt === 'undefined') {
  globalRef.lastRevalidatedAt = 0;
}

export function getLastRevalidatedAt(): number {
  return globalRef.lastRevalidatedAt;
}

export function setLastRevalidatedAt(val: number) {
  globalRef.lastRevalidatedAt = val;
}

export function clearCache() {
  inflight.clear();
  try {
    revalidateTag('articles');
    revalidateTag('promises');
    revalidateTag('entities');
    revalidatePath('/', 'layout');
  } catch (e) {
    console.error('Failed to revalidate in clearCache:', e);
  }
}

async function getHeavyOverviewStats() {
  return cached('heavyOverviewStats', ['articles'], async () => {
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);
    const [ministerRes, partyRes, stateRes] = await db.batch([
      {
        sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.ministers_mentioned) j
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.scraped_at >= ?
              GROUP BY j.value ORDER BY c DESC LIMIT 20`,
        args: [thirtyDaysAgo]
      },
      {
        sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.party_mentioned) j
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.scraped_at >= ?
              GROUP BY j.value ORDER BY c DESC`,
        args: [thirtyDaysAgo]
      },
      {
        sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.states_mentioned) j
              WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.scraped_at >= ?
              GROUP BY j.value ORDER BY c DESC`,
        args: [thirtyDaysAgo]
      }
    ]);

    const top_ministers_30d: Record<string, number> = {};
    ministerRes.rows.forEach(r => { top_ministers_30d[String(r.val)] = Number(r.c); });

    const top_parties_30d: Record<string, number> = {};
    partyRes.rows.forEach(r => { top_parties_30d[String(r.val)] = Number(r.c); });

    const top_states_30d: Record<string, number> = {};
    stateRes.rows.forEach(r => {
      let val = String(r.val);
      if (val === "Andaman") val = "Andaman and Nicobar";
      if (val === "Kashmir" || val === "Jammu" || val === "J&K" || val === "JK") val = "Jammu and Kashmir";
      if (val === "UP") val = "Uttar Pradesh";
      top_states_30d[val] = (top_states_30d[val] || 0) + Number(r.c);
    });

    return { top_ministers_30d, top_parties_30d, top_states_30d };
  });
}

export const serverApi = {
  async indiaOverview(): Promise<IndiaOverview | null> {
    return cached('indiaOverview', ['entities', 'promises', 'articles'], async () => {
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
        flagCatsRes
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
          sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target,
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

      const heavyStats = await getHeavyOverviewStats();
      const { top_ministers_30d, top_parties_30d, top_states_30d } = heavyStats;

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
    return cached('manifest', ['entities'], async () => {
      const entities = await loadEntities();
      if (!entities) return null;

      const partiesList = (entities.india?.parties || []);
      const statesList = (entities.india?.states || []);
      const ministersList = getAllPoliticians(entities);

      const partiesEndpoints: Record<string, string> = {};
      partiesList.forEach((p: any) => {
        const slug = partySlugify(p.name);
        partiesEndpoints[slug] = `party_${slug}.json`;
      });

      const ministersEndpoints: Record<string, string> = {};
      ministersList.forEach((m: any) => {
        const slug = m.name.toLowerCase().replace(/ /g, '_').replace(/\./g, '').replace(/[^a-z0-9_]/g, '');
        ministersEndpoints[slug] = `minister_${slug}.json`;
      });

      const statesEndpoints: Record<string, string> = {};
      statesList.forEach((s: any) => {
        const slug = s.name.toLowerCase().replace(/ /g, '_').replace(/\./g, '').replace(/[^a-z0-9_]/g, '');
        statesEndpoints[slug] = `state_${slug}.json`;
      });

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
          india_overview: "india_overview.json",
          parties: partiesEndpoints,
          ministers: ministersEndpoints,
          states: statesEndpoints
        },
        stats: {
          parties_count: partiesList.length,
          states_count: statesList.length,
          ministers_count: ministersList.length,
          topics_count: 5
        }
      };
    });
  },

  async party(name: string): Promise<PartyData | null> {
    return cached(`party:${name.toLowerCase()}`, ['entities', 'promises'], async () => {
      const entities = await loadEntities();
      const promises = await loadPromisesRegistry();
      if (!entities) return null;

      const searchSlug = slugify(name);
      const partyInfo = (entities.india?.parties || []).find((p: any) => {
        const pName = p.name.toLowerCase();
        const pFullName = (p.full_name || '').toLowerCase();
        return pName === name.toLowerCase() ||
               pFullName === name.toLowerCase() ||
               slugify(p.full_name || '') === searchSlug ||
               partySlugify(p.full_name || '') === searchSlug ||
               partySlugify(p.name) === searchSlug ||
               slugify(p.name) === searchSlug ||
               p.aliases?.some((a: string) => 
                 a.toLowerCase() === name.toLowerCase() || 
                 slugify(a) === searchSlug || 
                 partySlugify(a) === searchSlug
               );
      });
      if (!partyInfo) return null;

      const partyName = partyInfo.name;

      // Fetch articles and stats in a single batch
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

      const [articlesRes, totalRes, last30dRes, sentimentRes] = await db.batch([
        {
          sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                       a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
                FROM articles a
                LEFT JOIN sources s ON a.source_id = s.id
                WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.party_mentioned LIKE ?
                ORDER BY a.scraped_at DESC LIMIT 100`,
          args: [`%${partyName}%`]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND party_mentioned LIKE ?`,
          args: [`%${partyName}%`]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND party_mentioned LIKE ? AND scraped_at >= ?`,
          args: [`%${partyName}%`, thirtyDaysAgo]
        },
        {
          sql: `SELECT sentiment, COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND party_mentioned LIKE ? AND scraped_at >= ?
                GROUP BY sentiment`,
          args: [`%${partyName}%`, thirtyDaysAgo]
        }
      ]);

      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));
      const total_articles = Number(totalRes.rows[0]?.c || 0);
      const articles_last_30d = Number(last30dRes.rows[0]?.c || 0);

      const sentimentStats: Record<string, number> = {};
      sentimentRes.rows.forEach(r => {
        if (r.sentiment) sentimentStats[String(r.sentiment)] = Number(r.c);
      });

      // Filter ministers
      const ministers = getAllPoliticians(entities)
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
          total_articles,
          articles_last_30d
        },
        ministers,
        promises: partyPromises,
        recent_articles
      };
    }, { revalidate: 86400 });
  },

  async minister(name: string): Promise<Minister | null> {
    return cached(`minister:${name.toLowerCase()}`, ['entities', 'promises'], async () => {
      const entities = await loadEntities();
      const promises = await loadPromisesRegistry();
      if (!entities) return null;

      const allMinisters = getAllPoliticians(entities);
      const searchSlug = slugify(name);

      const ministerInfo = allMinisters.find((m: any) => {
        const mName = m.name.toLowerCase();
        return mName === name.toLowerCase() ||
               slugify(m.name) === searchSlug ||
               m.aliases?.some((a: string) => a.toLowerCase() === name.toLowerCase() || slugify(a) === searchSlug);
      });
      if (!ministerInfo) return null;

      const canonicalName = ministerInfo.name;

      // Fetch articles and stats in a single batch
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

      const [articlesRes, totalRes, last30dRes, sentimentRes] = await db.batch([
        {
          sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                       a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
                FROM articles a
                LEFT JOIN sources s ON a.source_id = s.id
                WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.ministers_mentioned LIKE ?
                ORDER BY a.scraped_at DESC LIMIT 100`,
          args: [`%${canonicalName}%`]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND ministers_mentioned LIKE ?`,
          args: [`%${canonicalName}%`]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND ministers_mentioned LIKE ? AND scraped_at >= ?`,
          args: [`%${canonicalName}%`, thirtyDaysAgo]
        },
        {
          sql: `SELECT sentiment, COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND ministers_mentioned LIKE ? AND scraped_at >= ?
                GROUP BY sentiment`,
          args: [`%${canonicalName}%`, thirtyDaysAgo]
        }
      ]);

      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));
      const total_articles = Number(totalRes.rows[0]?.c || 0);
      const articles_last_30d = Number(last30dRes.rows[0]?.c || 0);

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
        relationship: ministerInfo.relationship || '',
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
          total_articles,
          articles_last_30d
        },
        promises: ministerPromises,
        recent_articles
      };
    }, { revalidate: 86400 });
  },

  async state(name: string): Promise<StateData | null> {
    return cached(`state:${name.toLowerCase()}`, ['entities'], async () => {
      const entities = await loadEntities();
      if (!entities) return null;

      const searchSlug = slugify(name);
      const stateInfo = (entities.india?.states || []).find((s: any) => {
        const sName = s.name.toLowerCase();
        return sName === name.toLowerCase() ||
               slugify(s.name) === searchSlug ||
               s.aliases?.some((a: string) => a.toLowerCase() === name.toLowerCase() || slugify(a) === searchSlug);
      });
      if (!stateInfo) return null;

      const stateName = stateInfo.name;
      const aliases = stateInfo.aliases || [];
      const searchTerms = [stateName, ...aliases];
      if (stateName === "Andaman and Nicobar") searchTerms.push("Andaman");
      if (stateName === "Jammu and Kashmir") { searchTerms.push("Jammu"); searchTerms.push("Kashmir"); }
      if (stateName === "Uttar Pradesh") searchTerms.push("UP");

      const uniqueSearchTerms = Array.from(new Set(searchTerms));

      const likeClauseA = "(" + uniqueSearchTerms.map(() => "a.states_mentioned LIKE ?").join(" OR ") + ")";
      const likeClausePlain = "(" + uniqueSearchTerms.map(() => "states_mentioned LIKE ?").join(" OR ") + ")";
      const likeArgs = uniqueSearchTerms.map(term => `%${term}%`);

      // Fetch articles, counts, and aggregations in a single batch
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

      const [articlesRes, totalRes, last30dRes, cityRes, topicRes] = await db.batch([
        {
          sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                       a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
                 FROM articles a
                 LEFT JOIN sources s ON a.source_id = s.id
                 WHERE a.status IN ('classified', 'entity_processed', 'processed') AND ${likeClauseA}
                 ORDER BY a.scraped_at DESC LIMIT 100`,
          args: [...likeArgs]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                 WHERE status IN ('classified', 'entity_processed', 'processed') AND ${likeClausePlain}`,
          args: [...likeArgs]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                 WHERE status IN ('classified', 'entity_processed', 'processed') AND ${likeClausePlain} AND scraped_at >= ?`,
          args: [...likeArgs, thirtyDaysAgo]
        },
        {
          sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.cities_mentioned) j
                 WHERE a.status IN ('classified', 'entity_processed', 'processed') AND ${likeClauseA} AND a.scraped_at >= ?
                 GROUP BY j.value ORDER BY c DESC LIMIT 10`,
          args: [...likeArgs, thirtyDaysAgo]
        },
        {
          sql: `SELECT j.value as val, COUNT(*) as c FROM articles a, json_each(a.topic_tags) j
                 WHERE a.status IN ('classified', 'entity_processed', 'processed') AND ${likeClauseA} AND a.scraped_at >= ?
                 GROUP BY j.value ORDER BY c DESC LIMIT 10`,
          args: [...likeArgs, thirtyDaysAgo]
        }
      ]);

      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));
      const total_articles = Number(totalRes.rows[0]?.c || 0);
      const articles_last_30d = Number(last30dRes.rows[0]?.c || 0);

      const top_cities_30d: Record<string, number> = {};
      cityRes.rows.forEach(r => { top_cities_30d[String(r.val)] = Number(r.c); });

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
          total_articles,
          articles_last_30d
        },
        top_cities_30d,
        top_topics_30d,
        recent_articles
      };
    }, { revalidate: 86400 });
  },

  async topic(name: string): Promise<TopicData | null> {
    return cached(`topic:${name.toLowerCase()}`, [], async () => {
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);
      const canonicalTags = [
        'corruption_scam', 'crime_violence', 'economy', 'education', 'farmer_agriculture', 
        'foreign_policy', 'health', 'infrastructure', 'political_gaffe', 'protest_opposition', 'rape_sexual_crime'
      ];
      const searchSlug = slugify(name);
      const canonical = canonicalTags.find(tag => {
        const sluggedTag = tag.toLowerCase();
        return sluggedTag === searchSlug || 
               sluggedTag.replace(/_/g, '') === searchSlug.replace(/_/g, '') ||
               sluggedTag.includes(searchSlug) || 
               searchSlug.includes(sluggedTag) ||
               (searchSlug.startsWith('corruption') && tag === 'corruption_scam') ||
               (searchSlug.startsWith('farmer') && tag === 'farmer_agriculture');
      });

      if (!canonical) return null;

      const [articlesRes, totalRes, last30dRes] = await db.batch([
        {
          sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                       a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
                FROM articles a
                LEFT JOIN sources s ON a.source_id = s.id
                WHERE a.status IN ('classified', 'entity_processed', 'processed') AND a.topic_tags LIKE ?
                ORDER BY a.scraped_at DESC LIMIT 100`,
          args: [`%${canonical}%`]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND topic_tags LIKE ?`,
          args: [`%${canonical}%`]
        },
        {
          sql: `SELECT COUNT(*) as c FROM articles 
                WHERE status IN ('classified', 'entity_processed', 'processed') AND topic_tags LIKE ? AND scraped_at >= ?`,
          args: [`%${canonical}%`, thirtyDaysAgo]
        }
      ]);

      const recent_articles = articlesRes.rows.map(row => mapRowToArticle(row));
      const total_articles = Number(totalRes.rows[0]?.c || 0);
      const articles_last_30d = Number(last30dRes.rows[0]?.c || 0);

      return {
        generated_at: new Date().toISOString(),
        topic: canonical,
        stats: {
          total_articles,
          articles_last_30d
        },
        recent_articles
      };
    }, { revalidate: 86400 });
  },

  async category(name: string): Promise<{ articles?: Article[] } | null> {
    return cached(`category:${name.toLowerCase()}`, ['articles'], async () => {
      const articlesRes = await db.execute({
        sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
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
    return cached('promises', ['promises'], async () => {
      const registry = await loadPromisesRegistry();
      if (!registry) return null;

      const byStatus: Record<string, any[]> = { kept: [], broken: [], ongoing: [], void: [] };
      const byPerson: Record<string, any[]> = {};
      const byParty: Record<string, any[]> = {};
      let criticalCount = 0;

      for (const p of (registry.promises || [])) {
        const status = p.status || 'ongoing';
        const person = p.person || '';
        const party = p.party || '';

        if (p.importance === 'critical') {
          criticalCount++;
        }

        const light = {
          id: p.id,
          person,
          role: p.role,
          party,
          party_verified: p.party_verified,
          promise: p.promise,
          category: p.category || '',
          status,
          made_on: p.made_on || p.created_at || '',
          deadline: p.deadline || '',
          source_url: p.source_url || '',
          url: p.url || p.source_url || '',
          source_description: p.source_description || '',
          promise_type: p.promise_type || '',
          archived_url: p.archived_url,
          url_status: p.url_status,
          archive_source: p.archive_source,
          search_fallback_url: p.search_fallback_url,
          source_quality: p.source_quality,
          supporting_quote: p.supporting_quote,
          evidence_count: p.evidence_articles?.length || 0,
          evidence_articles: p.evidence_articles || [],
          gemma_suggestion: p.gemma_suggestion,
          gemma_reasoning: p.gemma_reasoning,
          importance: p.importance,
          importance_reason: p.importance_reason,
          status_history: p.status_history
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
          void: byStatus.void.length,
          critical: criticalCount
        },
        by_status: byStatus as any,
        by_person: byPerson,
        by_party: byParty
      };
    });
  },

  async feed(type: string): Promise<{ generated_at?: string; total?: number; articles?: Article[] } | null> {
    return cached(`feed:${type.toLowerCase()}`, ['articles'], async () => {
      let query = `
        SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
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

      const INDIA_FILTER = ` AND (a.category != 'international'
        OR a.party_mentioned     NOT IN ('[]','')
        OR a.ministers_mentioned NOT IN ('[]','')
        OR a.states_mentioned    NOT IN ('[]','')
        OR a.cities_mentioned    NOT IN ('[]',''))`;

      if (type === 'flagged') {
        query += INDIA_FILTER + " AND a.civic_flag = 1 ORDER BY a.civic_flag_score DESC, a.scraped_at DESC LIMIT 200";
      } else if (category_map[type]) {
        if (category_map[type] !== 'international') {
          query += INDIA_FILTER;
        }
        query += " AND a.category = ? ORDER BY a.scraped_at DESC LIMIT 200";
        args.push(category_map[type]);
      } else if (topic_map[type]) {
        query += INDIA_FILTER + " AND a.topic_tags LIKE ? ORDER BY a.scraped_at DESC LIMIT 200";
        args.push(`%${topic_map[type]}%`);
      } else {
        // 'all' feed
        query += INDIA_FILTER + " ORDER BY a.scraped_at DESC LIMIT 200";
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
    return cached(`articleContent:${id}`, ['articles'], async () => {
      const res = await db.execute({
        sql: 'SELECT content FROM articles WHERE id = ?',
        args: [id]
      });
      if (!res.rows.length) return null;
      const content = decompressText(res.rows[0].content);
      return { content: content || undefined };
    });
  },

  async search(query: string): Promise<{ articles?: Article[] } | null> {
    return cached(`search:${query.toLowerCase()}`, ['articles'], async () => {
      const raw = query.trim().toLowerCase();
      if (raw.length < 2) return { articles: [] };

      // Multi-word: every token must appear in at least one field (AND across
      // tokens, OR across fields) — so "modi farmers" finds articles about both.
      const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 6);
      const fields = [
        'a.title', 'a.rephrased_title', 'a.rephrased_article', 'a.party_mentioned', 'a.ministers_mentioned',
        'a.states_mentioned', 'a.cities_mentioned', 'a.topic_tags', 'a.category', 's.name'
      ];

      const whereArgs: any[] = [];
      const tokenClauses = tokens.map(tok => {
        const like = `%${tok}%`;
        const ors = fields.map(f => { whereArgs.push(like); return `LOWER(${f}) LIKE ?`; }).join(' OR ');
        return `(${ors})`;
      }).join(' AND ');

      // Relevance: title match ranks highest, then entity (minister/party/state)
      // match, then everything else — ranked on the first token; recency breaks ties.
      const t0 = `%${tokens[0]}%`;
      const relevanceArgs = [t0, t0, t0, t0];

      // Limit search to the last 30 days of scraped news.
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

      const res = await db.execute({
        sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason,
                     (CASE
                        WHEN LOWER(a.title) LIKE ? THEN 3
                        WHEN LOWER(a.ministers_mentioned) LIKE ? OR LOWER(a.party_mentioned) LIKE ? OR LOWER(a.states_mentioned) LIKE ? THEN 2
                        ELSE 1
                      END) AS relevance
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.status IN ('classified', 'entity_processed', 'processed')
                AND a.scraped_at >= ?
                AND ${tokenClauses}
              ORDER BY relevance DESC, a.scraped_at DESC
              LIMIT 80`,
        args: [...relevanceArgs, thirtyDaysAgo, ...whereArgs]
      });
      const articles = res.rows.map(row => mapRowToArticle(row));
      return { articles };
    });
  },

  async source(name: string): Promise<{ source?: string; articles?: Article[] } | null> {
    return cached(`source:${name.toLowerCase()}`, [], async () => {
      // 1. Fetch all sources and match by slugified name in JS
      const sourcesCheck = await db.execute("SELECT id, name FROM sources");
      const matchedSource = sourcesCheck.rows.find(
        (s: any) => slugify(String(s.name)) === slugify(name)
      );
      if (!matchedSource) return null;

      const canonicalName = String(matchedSource.name);

      // 2. Fetch recent articles from this source using source_id
      const res = await db.execute({
        sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target, a.rephrased_article,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.status IN ('classified', 'entity_processed', 'processed')
                AND a.source_id = ?
              ORDER BY a.scraped_at DESC LIMIT 100`,
        args: [Number(matchedSource.id)]
      });
      const articles = res.rows.map(row => mapRowToArticle(row));
      return { source: canonicalName, articles };
    }, { revalidate: 86400 });
  },

  async politicians(): Promise<any[] | null> {
    return cached('politicians', ['entities'], async () => {
      const entities = await loadEntities();
      if (!entities) return null;
      const list = getAllPoliticians(entities);
      return list.map((m: any) => ({
        name: m.name,
        role: m.role || '',
        party: m.party || '',
        state: m.state || '',
        party_verified: m.party_verified,
        criminal_last_updated: m.criminal_last_updated
      }));
    });
  },

  async article(id: number): Promise<Article | null> {
    return cached(`article:${id}`, ['articles', 'promises'], async () => {
      const res = await db.execute({
        sql: `SELECT a.id, a.title, a.rephrased_title, a.url, s.name AS source_name, a.image_url, a.scraped_at, a.category, a.sentiment, a.sentiment_target,
                     a.rephrased_article, a.content,
                     a.party_mentioned, a.ministers_mentioned, a.states_mentioned, a.cities_mentioned, a.topic_tags, a.civic_flag, a.civic_flag_score, a.civic_flag_category, a.civic_flag_reason
              FROM articles a
              LEFT JOIN sources s ON a.source_id = s.id
              WHERE a.id = ? AND a.status IN ('classified', 'entity_processed', 'processed')`,
        args: [id]
      });
      if (!res.rows.length) return null;
      const art = mapRowToArticle(res.rows[0]);

      // Backfill durability fields from the promises registry if matched by URL
      try {
        const promises = await loadPromisesRegistry();
        if (promises?.promises) {
          for (const p of promises.promises) {
            const matchedEvidence = (p.evidence_articles || []).find(
              (e: any) => e.url === art.url || (art.url && e.url && e.url.toLowerCase() === art.url.toLowerCase())
            );
            if (matchedEvidence) {
              art.supporting_quote = matchedEvidence.supporting_quote || matchedEvidence.quote || undefined;
              art.archived_url = matchedEvidence.archived_url || undefined;
              art.archive_source = matchedEvidence.archive_source || undefined;
              art.url_status = matchedEvidence.url_status || undefined;
              art.search_fallback_url = matchedEvidence.search_fallback_url || undefined;
              break;
            }
          }
        }
      } catch (e) {
        console.error("Failed to load promises registry for article metadata:", e);
      }

      return art;
    });
  }
};
