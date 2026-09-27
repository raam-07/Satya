import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  const secret = searchParams.get('secret') || '';
  const expected = process.env.ADMIN_NOTIFY_KEY || process.env.REVALIDATE_SECRET || 'satya_admin_secret_2024';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTs = Math.floor(Date.now() / 1000) - (days * 24 * 3600);

  try {
    // 1. Pending counts
    const pendingRes = await db.execute(`
      SELECT
        SUM(CASE WHEN status = 'scraped' THEN 1 ELSE 0 END) as pending_rephrase,
        SUM(CASE WHEN status = 'rephrased' THEN 1 ELSE 0 END) as pending_classify,
        SUM(CASE WHEN status = 'classified' THEN 1 ELSE 0 END) as pending_entity,
        SUM(CASE WHEN status = 'entity_processed' THEN 1 ELSE 0 END) as pending_processed
      FROM articles
    `);
    const pRow = pendingRes.rows[0];
    
    // Timeline pending (Exact logic mirroring timeline_pipeline.py)
    const timelineRes = await db.execute(`
      SELECT COUNT(*) as c FROM articles 
      WHERE id > (SELECT COALESCE(MAX(last_article_id), 0) FROM timeline_checkpoint WHERE id = 1)
      AND status IN ('classified', 'entity_processed', 'processed') 
      AND (
        category != 'international' 
        OR party_mentioned NOT IN ('[]','') 
        OR ministers_mentioned NOT IN ('[]','') 
        OR states_mentioned NOT IN ('[]','') 
        OR cities_mentioned NOT IN ('[]','')
      )
      AND id NOT IN (SELECT article_id FROM event_articles)
    `);
    const pendingTimeline = timelineRes.rows[0]?.c || 0;

    // 2. Daily Trends
    const trendsRes = await db.execute({
      sql: `
        SELECT 
          date(scraped_at, 'unixepoch') as day,
          COUNT(*) as scraped_count,
          SUM(CASE WHEN status IN ('classified', 'entity_processed', 'processed') THEN 1 ELSE 0 END) as classified_count,
          SUM(CASE WHEN civic_flag = 1 THEN 1 ELSE 0 END) as civic_count,
          SUM(CASE WHEN translated_hi = 1 THEN 1 ELSE 0 END) as translated_count
        FROM articles
        WHERE scraped_at >= ?
        GROUP BY day
        ORDER BY day ASC
      `,
      args: [startTs]
    });
    const trends = trendsRes.rows.map(r => ({
      day: r.day,
      scraped: Number(r.scraped_count),
      classified: Number(r.classified_count),
      civic: Number(r.civic_count),
      translated: Number(r.translated_count)
    }));

    // 3. Category Breakdown
    const categoryRes = await db.execute({
      sql: `
        SELECT category, COUNT(*) as c
        FROM articles
        WHERE scraped_at >= ? AND category IS NOT NULL AND status IN ('classified', 'entity_processed', 'processed')
        GROUP BY category
        ORDER BY c DESC
      `,
      args: [startTs]
    });
    const categories = categoryRes.rows.map(r => ({
      name: r.category,
      count: Number(r.c)
    }));

    // 4. Sentiment Breakdown
    const sentimentRes = await db.execute({
      sql: `
        SELECT sentiment, COUNT(*) as c
        FROM articles
        WHERE scraped_at >= ? AND sentiment IS NOT NULL AND status IN ('classified', 'entity_processed', 'processed')
        GROUP BY sentiment
      `,
      args: [startTs]
    });
    const sentiments = sentimentRes.rows.map(r => ({
      name: String(r.sentiment).charAt(0).toUpperCase() + String(r.sentiment).slice(1),
      value: Number(r.c)
    }));

    // 5. Source Breakdown
    const sourceRes = await db.execute({
      sql: `
        SELECT s.name, COUNT(*) as c
        FROM articles a
        JOIN sources s ON a.source_id = s.id
        WHERE a.scraped_at >= ? AND a.status IN ('classified', 'entity_processed', 'processed')
        GROUP BY s.id
        ORDER BY c DESC
        LIMIT 5
      `,
      args: [startTs]
    });
    const sources = sourceRes.rows.map(r => ({
      name: r.name,
      value: Number(r.c)
    }));

    // 6. Civic Flag Categories
    const civicCatRes = await db.execute({
      sql: `
        SELECT civic_flag_category, COUNT(*) as c
        FROM articles
        WHERE scraped_at >= ? AND civic_flag = 1 AND civic_flag_category IS NOT NULL
        GROUP BY civic_flag_category
        ORDER BY c DESC
        LIMIT 5
      `,
      args: [startTs]
    });
    const civicCats = civicCatRes.rows.map(r => ({
      name: r.civic_flag_category,
      count: Number(r.c)
    }));

    return NextResponse.json({
      pending: {
        rephrase: Number(pRow?.pending_rephrase || 0),
        classify: Number(pRow?.pending_classify || 0),
        entity: Number(pRow?.pending_entity || 0),
        timeline: Number(pendingTimeline)
      },
      trends,
      categories,
      sentiments,
      sources,
      civicCats
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
