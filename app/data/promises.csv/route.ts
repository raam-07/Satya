import { promiseRows, toCsv, DATASET_LICENSE, DATASET_CITATION } from '@/lib/promiseDataset'

export const revalidate = 3600

export async function GET() {
  const csv = toCsv(await promiseRows())
  return new Response('﻿' + csv, {   // BOM so Excel opens Hindi / special characters correctly
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="satyadheesh-promises.csv"',
      'Link': `<${DATASET_LICENSE}>; rel="license"`,
      'X-Citation': DATASET_CITATION,
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
