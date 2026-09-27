'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Tag = { paper: string; subject: string; subjectLabel: string; nodeLabel: string; pointers: number; hasMains: boolean }

/** "UPSC · GS2 › Polity › Elections" line on an article that has a UPSC note. Renders nothing otherwise. */
export function UpscChip({ articleId }: { articleId: number }) {
  const [tag, setTag] = useState<Tag | null>(null)

  useEffect(() => {
    let live = true
    fetch(`/api/upsc?article=${articleId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d?.tag) setTag(d.tag) })
      .catch(() => {})
    return () => { live = false }
  }, [articleId])

  if (!tag) return null
  const extras = [tag.pointers > 0 && 'Prelims pointers', tag.hasMains && 'Mains question'].filter(Boolean).join(' & ')

  return (
    <Link
      href={`/upsc?subject=${encodeURIComponent(tag.subject)}#a${articleId}`}
      className="group mb-5 flex items-start gap-2 rounded-sm border px-3 py-2 text-[12.5px] leading-snug transition-colors hover:border-[var(--accent)]"
      style={{ borderColor: 'var(--border-md)', background: 'var(--bg-alt)' }}
    >
      <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest pt-[2px]" style={{ color: 'var(--accent)' }}>
        UPSC
      </span>
      <span style={{ color: 'var(--text1)' }}>
        <span className="font-semibold">{tag.paper} › {tag.subjectLabel} › {tag.nodeLabel}</span>
        {extras && <span style={{ color: 'var(--text2)' }}> · {extras}</span>}
        <span className="ml-1 group-hover:underline" style={{ color: 'var(--accent)' }}>→</span>
      </span>
    </Link>
  )
}
