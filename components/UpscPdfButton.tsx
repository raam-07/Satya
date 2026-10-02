import { reportEditions, reportPdfPath, type ReportFile, type ReportKind } from '@/lib/upscReports'

// Download buttons for a report's PDFs: the short Brief first, the Detailed notes second, and the other
// language as a link. Shows "being prepared" until the builder job has stored the files.
export function UpscPdfButton({ kind, period, isHi, files }: {
  kind: ReportKind; period: string; isHi: boolean; files: Record<string, ReportFile>
}) {
  const mineEd = reportEditions(files, kind, period, isHi ? 'hi' : 'en')
  const otherEd = reportEditions(files, kind, period, isHi ? 'en' : 'hi')
  const mine = mineEd.brief ?? mineEd.detailed
  const other = otherEd.brief ?? otherEd.detailed
  const mb = (f: ReportFile) => f.bytes >= 1e6 ? `${(f.bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.bytes / 1e3))} KB`
  const when = (f: ReportFile) => new Date(f.updatedAt * 1000).toLocaleString(isHi ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
      {mineEd.brief && (
        <a
          href={reportPdfPath(kind, period, isHi, 'brief')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity"
          download
        >
          ⬇ {isHi ? 'सार डाउनलोड करें' : 'Download Brief'}
          <span className="font-mono text-[11px] font-normal opacity-80">{mb(mineEd.brief)}</span>
        </a>
      )}
      {mineEd.detailed && (
        <a
          href={reportPdfPath(kind, period, isHi, mineEd.brief ? 'detailed' : undefined)}
          className={mineEd.brief
            ? 'inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-semibold border text-[var(--accent)] hover:bg-[var(--bgAlt)] transition-colors'
            : 'inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity'}
          style={mineEd.brief ? { borderColor: 'var(--accent)' } : undefined}
          download
        >
          ⬇ {mineEd.brief ? (isHi ? 'विस्तृत नोट्स' : 'Detailed notes') : (isHi ? 'पीडीएफ डाउनलोड करें' : 'Download PDF')}
          <span className="font-mono text-[11px] font-normal opacity-80">{mb(mineEd.detailed)}</span>
        </a>
      )}
      {!mine && (
        <span className="inline-flex items-center px-3.5 py-2 rounded-md text-[13px] border text-[var(--text3)]" style={{ borderColor: 'var(--border)' }}>
          {isHi ? 'पीडीएफ तैयार हो रहा है…' : 'PDF being prepared…'}
        </span>
      )}
      {other && (
        <a href={reportPdfPath(kind, period, !isHi, otherEd.brief ? 'brief' : undefined)} className="text-[12.5px] font-medium text-[var(--accent)] hover:underline" download>
          {isHi ? 'English PDF' : 'हिंदी पीडीएफ'}
        </a>
      )}
      {mine && (
        <span className="text-[11px] font-mono text-[var(--text3)]">
          {isHi ? 'अपडेट' : 'Updated'} {when(mine)} IST
        </span>
      )}
    </div>
  )
}
