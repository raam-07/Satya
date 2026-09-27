import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
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
    
    // Timeline pending
    const timelineRes = await db.execute(`
      SELECT COUNT(*) as c FROM articles 
      WHERE status IN ('classified', 'entity_processed', 'processed') 
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

    // 3. Category Breakdown (last X days)
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

    return NextResponse.json({
      pending: {
        rephrase: Number(pRow?.pending_rephrase || 0),
        classify: Number(pRow?.pending_classify || 0),
        entity: Number(pRow?.pending_entity || 0),
        timeline: Number(pendingTimeline)
      },
      trends,
      categories
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
