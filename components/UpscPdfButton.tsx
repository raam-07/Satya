import { reportFileKey, reportPdfPath, type ReportFile, type ReportKind } from '@/lib/upscReports'

// Download buttons for a report's PDFs (current language first, the other language as a
// secondary link). Shows "being prepared" until the builder job has stored the file.
export function UpscPdfButton({ kind, period, isHi, files }: {
  kind: ReportKind; period: string; isHi: boolean; files: Record<string, ReportFile>
}) {
  const mine = files[reportFileKey(kind, period, isHi ? 'hi' : 'en')]
  const other = files[reportFileKey(kind, period, isHi ? 'en' : 'hi')]
  const mb = (f: ReportFile) => f.bytes >= 1e6 ? `${(f.bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.bytes / 1e3))} KB`
  const when = (f: ReportFile) => new Date(f.updatedAt * 1000).toLocaleString(isHi ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
      {mine ? (
        <a
          href={reportPdfPath(kind, period, isHi)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity"
          download
        >
          ⬇ {isHi ? 'पीडीएफ डाउनलोड करें' : 'Download PDF'}
          <span className="font-mono text-[11px] font-normal opacity-80">{mb(mine)}</span>
        </a>
      ) : (
        <span className="inline-flex items-center px-3.5 py-2 rounded-md text-[13px] border text-[var(--text3)]" style={{ borderColor: 'var(--border)' }}>
          {isHi ? 'पीडीएफ तैयार हो रहा है…' : 'PDF being prepared…'}
        </span>
      )}
      {other && (
        <a href={reportPdfPath(kind, period, !isHi)} className="text-[12.5px] font-medium text-[var(--accent)] hover:underline" download>
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
