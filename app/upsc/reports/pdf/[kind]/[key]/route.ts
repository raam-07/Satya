import { NextRequest, NextResponse } from 'next/server'
import { editionKeys, parsePeriod, pdfFileName, readReportPdf, type ReportEdition } from '@/lib/upscReports'

export const dynamic = 'force-dynamic'

// Serves a prebuilt report PDF from the UPSC DB (one row per ~400 KB chunk).
export async function GET(req: NextRequest, { params }: { params: { kind: string; key: string } }) {
  const period = parsePeriod(params.kind, params.key)
  if (!period) return new NextResponse('Not found', { status: 404 })
  const qs = new URL(req.url).searchParams
  const lang = qs.get('lang') === 'hi' ? 'hi' : 'en'
  const ed = qs.get('edition')
  const edition: ReportEdition | null = ed === 'brief' || ed === 'detailed' ? ed : null
  let pdf: Buffer | null = null
  for (const k of editionKeys(period.kind, period.key, lang, edition)) {
    pdf = await readReportPdf(k)
    if (pdf) break
  }
  if (!pdf) return new NextResponse('This PDF is being prepared. Please try again in a little while.', { status: 404 })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFileName(period.kind, period.key, lang, edition)}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'public, max-age=900',
      'X-Robots-Tag': 'noindex',
    },
  })
}
