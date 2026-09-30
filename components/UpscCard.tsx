import Link from 'next/link'
import { cleanTitle } from '@/lib/utils'
import { UPSC_SYLLABUS } from '@/lib/upscSyllabus'
import { subjectLabel, nodeLabel, type UpscItem } from '@/lib/upsc'

// Shared by /upsc and the daily pages (/upsc/current-affairs/[date]).
export const PAPER_HINT: Record<string, { en: string; hi: string }> = {
  GS1: { en: 'History · Society · Geography', hi: 'इतिहास · समाज · भूगोल' },
  GS2: { en: 'Polity · Governance · IR', hi: 'राजव्यवस्था · शासन · अंतर्राष्ट्रीय संबंध' },
  GS3: { en: 'Economy · S&T · Environment · Security', hi: 'अर्थव्यवस्था · विज्ञान-तकनीक · पर्यावरण · सुरक्षा' },
  GS4: { en: 'Ethics', hi: 'नीतिशास्त्र' },
}

export const POINTER_LABEL: Record<string, string> = {
  constitution: 'Constitution', act_bill: 'Act / Bill', scheme: 'Scheme', institution: 'Body',
  report_index: 'Report / Index', place: 'Place', species_environment: 'Environment',
  sci_tech: 'S&T', international_org: 'Intl. org', person_post: 'Post', data_fact: 'Fact',
}

export const EXAM_LABEL = { prelims: 'Prelims', mains: 'Mains', both: 'Prelims + Mains' } as const

export function UpscCard({ it, isHi }: { it: UpscItem; isHi: boolean }) {
  const paperLink = `/upsc?paper=${it.paper}${isHi ? '&lang=hi' : ''}`
  const subjectLink = `/upsc?paper=${it.paper}&subject=${it.subject}${isHi ? '&lang=hi' : ''}`
  const examLink = `/upsc?${it.examType !== 'both' ? `exam=${it.examType}&` : ''}paper=${it.paper}${isHi ? '&lang=hi' : ''}`

  return (
    <article id={`a${it.articleId}`} className="scroll-mt-24 border rounded-xl px-4 md:px-5 py-4 bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-[var(--text3)] mb-1.5">
        <Link
          href={paperLink}
          className="font-semibold text-[var(--accent)] hover:underline"
          title={`Filter by ${it.paper}`}
        >
          {it.paper}
        </Link>
        <span>
          <Link
            href={subjectLink}
            className="hover:underline hover:text-[var(--text1)] transition-colors"
            title={`Filter by ${subjectLabel(it.subject)}`}
          >
            {subjectLabel(it.subject)}
          </Link>
          <span className="opacity-60"> › </span>
          <span>{nodeLabel(it.subject, it.node)}</span>
        </span>
        <Link
          href={examLink}
          className="ml-auto px-1.5 py-0.5 rounded border hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          style={{ borderColor: 'var(--border)' }}
          title={`Filter by ${EXAM_LABEL[it.examType]}`}
        >
          {EXAM_LABEL[it.examType] ?? 'Prelims + Mains'}
        </Link>
      </div>

      <h3 className="text-[16px] leading-snug font-semibold text-[var(--text1)] m-0">
        <Link href={`/news/${it.articleId}`} className="hover:text-[var(--accent)]">
          {cleanTitle(it.title)}
        </Link>
      </h3>

      <p className="text-[13.5px] text-[var(--text1)] mt-2 mb-0 leading-relaxed">
        <span className="font-semibold">{isHi ? 'चर्चा में क्यों: ' : 'Why in news: '}</span>{it.whyInNews}
      </p>
      <p className="text-[13px] text-[var(--text2)] mt-1.5 mb-0 leading-relaxed">{it.factBox}</p>

      {it.pointers.length > 0 && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-[12px] font-semibold text-[var(--text1)] select-none">
            Prelims pointers ({it.pointers.length})
          </summary>
          <ul className="mt-2 space-y-1.5 pl-0 list-none">
            {it.pointers.map((p, i) => (
              <li key={i} className="text-[13px] text-[var(--text2)] leading-snug flex gap-2">
                <span className="shrink-0 text-[10px] font-mono uppercase tracking-wide text-[var(--text3)] pt-0.5 w-[78px]">
                  {POINTER_LABEL[p.type] ?? 'Fact'}
                </span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {(it.mainsQuestion || it.mainsDimensions.length > 0) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-[var(--text1)] select-none">
            Mains angle
          </summary>
          {it.mainsQuestion && (
            <p className="text-[13px] italic text-[var(--text1)] mt-2 mb-1 leading-snug">Q. {it.mainsQuestion}</p>
          )}
          {it.mainsDimensions.length > 0 && (
            <ul className="text-[13px] text-[var(--text2)] mt-1 mb-0 pl-4 list-disc space-y-0.5">
              {it.mainsDimensions.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
          {it.keywords.length > 0 && (
            <p className="text-[12px] text-[var(--text3)] mt-2 mb-0">Keywords: {it.keywords.join(' · ')}</p>
          )}
        </details>
      )}


      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-[var(--text3)]">
        {it.source && it.sourceUrl && (
          <a href={it.sourceUrl} target="_blank" rel="noreferrer nofollow" className="hover:text-[var(--accent)]">
            {it.source} ↗
          </a>
        )}
        {it.event && (
          <Link href={`/event/${it.event.slug}`} className="hover:text-[var(--accent)]">
            {isHi ? 'रिवीजन के लिए कालक्रम →' : 'Chronology for revision →'}
          </Link>
        )}
        {it.related > 0 && (
          <span>{isHi ? `+${it.related} और खबरें इस विषय पर` : `+${it.related} more on this story`}</span>
        )}
        {it.secondary.map(s => (
          <Link
            key={s.node}
            href={`/upsc?paper=${UPSC_SYLLABUS[s.subject]?.paper}&subject=${s.subject}${isHi ? '&lang=hi' : ''}`}
            className="hover:underline hover:text-[var(--accent)] transition-colors"
          >
            {isHi ? 'यह भी ' : 'Also '}{UPSC_SYLLABUS[s.subject]?.paper} · {nodeLabel(s.subject, s.node)}
          </Link>
        ))}
      </div>
    </article>
  )
}

