import { NextRequest, NextResponse } from 'next/server'
import { buildReport, parsePeriod } from '@/lib/upscReports'
import { renderReportHtml } from '@/lib/upscReportHtml'

export const dynamic = 'force-dynamic'

// Print layout of a report. The PDF builder (GitHub Actions + Chromium) prints this page;
// it is not meant for readers (noindex) - they get the report page or the PDF.
export async function GET(req: NextRequest, { params }: { params: { kind: string; key: string } }) {
  const period = parsePeriod(params.kind, params.key)
  if (!period) return new NextResponse('Not found', { status: 404 })
  const lang = new URL(req.url).searchParams.get('lang') === 'hi' ? 'hi' : 'en'
  const report = await buildReport(period, lang)
  if (!report) return new NextResponse('No notes for this period', { status: 404 })
  return new NextResponse(renderReportHtml(report), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
      'X-Report-Hash': report.hash,
    },
  })
}
