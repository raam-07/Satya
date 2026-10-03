import { TelegramStrip } from '@/components/TelegramStrip'
import { reportEditions, reportPdfPath, type ReportFile, type ReportKind } from '@/lib/upscReports'

const mb = (f: ReportFile) => f.bytes >= 1e6 ? `${(f.bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.bytes / 1e3))} KB`

// Each language names itself in its own script, whatever the page language.
const LANG = {
  en: { name: 'English', brief: 'Brief', detailed: 'Detailed', single: 'Download PDF' },
  hi: { name: 'हिंदी', brief: 'सार', detailed: 'विस्तृत', single: 'पीडीएफ डाउनलोड' },
} as const

/**
 * Downloads for one report: a row per language (the page's language first), each with the short Brief
 * and the Detailed notes. A language whose PDF isn't stored yet says so (Hindi is stored once >= 80%
 * of the notes are translated).
 */
export function UpscPdfButton({ kind, period, isHi, files, telegram = true }: {
  kind: ReportKind; period: string; isHi: boolean; files: Record<string, ReportFile>; telegram?: boolean
}) {
  const langs: ('en' | 'hi')[] = isHi ? ['hi', 'en'] : ['en', 'hi']
  const rows = langs.map(lang => ({ lang, ed: reportEditions(files, kind, period, lang) }))
  const latest = rows.flatMap(r => [r.ed.brief, r.ed.detailed]).filter((f): f is ReportFile => Boolean(f))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const when = latest && new Date(latest.updatedAt * 1000).toLocaleString(isHi ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })

  if (!latest) {
    return (
      <div className="mt-3">
        <span className="inline-flex items-center px-3.5 py-2 rounded-md text-[13px] border text-[var(--text3)]" style={{ borderColor: 'var(--border)' }}>
          {isHi ? 'पीडीएफ तैयार हो रहा है…' : 'PDF being prepared…'}
        </span>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {rows.map(({ lang, ed }, i) => {
        // Brief first and filled for the page's language; everything else outlined
        const L = LANG[lang]
        const first = i === 0
        const filled = 'text-white bg-[var(--accent)] hover:opacity-90 transition-opacity'
        const outline = 'border text-[var(--accent)] hover:bg-[var(--bg-alt)] transition-colors'
        const btn = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold whitespace-nowrap'
        return (
          <div key={lang} lang={lang} className="sm:flex sm:items-center sm:gap-2">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1 sm:mb-0 sm:w-16 sm:shrink-0">{L.name}</div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {ed.brief && (
              <a href={reportPdfPath(kind, period, lang === 'hi', 'brief')} download
                className={`${btn} ${first ? filled : outline}`} style={first ? undefined : { borderColor: 'var(--accent)' }}>
                ⬇ {L.brief}
                <span className="font-mono text-[10.5px] font-normal opacity-75">{mb(ed.brief)}</span>
              </a>
            )}
            {ed.detailed && (
              <a href={reportPdfPath(kind, period, lang === 'hi', ed.brief ? 'detailed' : undefined)} download
                className={`${btn} ${outline}`} style={{ borderColor: 'var(--accent)' }}>
                ⬇ {ed.brief ? L.detailed : L.single}
                <span className="font-mono text-[10.5px] font-normal opacity-75">{mb(ed.detailed)}</span>
              </a>
            )}
            {!ed.brief && !ed.detailed && (
              <span className="col-span-2 text-[12px] text-[var(--text3)] py-1.5">
                {lang === 'hi' ? 'अनुवाद पूरा होने पर उपलब्ध' : 'Being prepared'}
              </span>
            )}
            </div>
          </div>
        )
      })}
      <p className="text-[11px] font-mono text-[var(--text3)] m-0">
        {isHi
          ? `सार: छोटा, जल्दी दोहराव के लिए · विस्तृत: पूरे नोट्स, तथ्य और प्रश्न · अपडेट ${when} IST`
          : `Brief: short, for quick revision · Detailed: full notes, facts and questions · Updated ${when} IST`}
      </p>
      {telegram && <TelegramStrip isHi={isHi} />}
    </div>
  )
}
