import { promiseRows, DATASET_LICENSE, DATASET_CITATION } from '@/lib/promiseDataset'

export const revalidate = 3600

export async function GET() {
  const rows = await promiseRows()
  return Response.json({
    name: 'SatyaDheesh promise tracker',
    description: 'Public promises made by Indian political leaders, with status (kept, broken, ongoing, void), dates, sources and evidence.',
    license: DATASET_LICENSE,
    citation: DATASET_CITATION,
    generated_at: new Date().toISOString(),
    count: rows.length,
    promises: rows,
  }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', 'Access-Control-Allow-Origin': '*' } })
}
