'use client'

import Link from 'next/link'
import { useManifest } from '@/lib/ManifestContext'
import { useToast } from '@/lib/ToastContext'

// ── Source tag — tappable ─────────────────────────────────────────────────────
export function SrcTag({ label }: { label?: string }) {
  if (!label) return null
  return (
    <Link
      href={`/source/${encodeURIComponent(label)}`}
      onClick={e => e.stopPropagation()}
      className="text-[10px] font-mono truncate max-w-[200px] inline-block hover:underline"
      style={{ color: 'var(--accent)', opacity: 0.85 }}
    >
      ↗ {label}
    </Link>
  )
}

// ── Party badge — tappable, manifest-aware ────────────────────────────────────
const PARTY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  BJP:      { bg: '#FFF3E0', text: '#BF4A07', border: '#FFB74D' },
  INC:      { bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' },
  Congress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' },
  AAP:      { bg: '#FFFDE7', text: '#92400E', border: '#FCD34D' },
  TMC:      { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
  DMK:      { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5' },
}
const DEFAULT_STYLE = { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' }

export function PBadge({ party }: { party?: string }) {
  const { hasParty, partySlug } = useManifest()
  const { showToast } = useToast()
  if (!party) return null

  const s = PARTY_STYLES[party] ?? DEFAULT_STYLE
  const baseStyle = {
    background: s.bg, color: s.text,
    border: `1px solid ${s.border}`,
    fontSize: 9, fontWeight: 700,
    letterSpacing: '0.09em', borderRadius: 2,
    padding: '1px 5px', whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
  }

  if (hasParty(party)) {
    return (
      <Link
        href={`/party/${partySlug(party)}`}
        onClick={e => e.stopPropagation()}
        className="font-mono"
        style={baseStyle}
      >
        {party}
      </Link>
    )
  }
  return (
    <button
      className="font-mono"
      style={baseStyle}
      onClick={e => { e.stopPropagation(); showToast(`Data for ${party} coming soon`) }}
    >
      {party}
    </button>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    kept:    { label: 'KEPT',    bg: '#1B7050', text: '#fff' },
    broken:  { label: 'BROKEN',  bg: '#B02828', text: '#fff' },
    ongoing: { label: 'ONGOING', bg: '#92400E', text: '#fff' },
  }
  const s = map[status ?? ''] ?? map.ongoing
  return (
    <span
      className="text-[8.5px] font-bold tracking-[0.09em] rounded-[2px] px-[6px] py-[2px] font-mono"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// ── Sentiment dot ─────────────────────────────────────────────────────────────
export function SentimentDot({ sentiment }: { sentiment?: string }) {
  const color =
    sentiment === 'positive' ? 'var(--green)' :
    sentiment === 'negative' ? 'var(--red)' :
    'var(--amber)'
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color }}
      title={sentiment}
    />
  )
}

// ── Tappable minister name ────────────────────────────────────────────────────
export function TappableMinister({ name }: { name: string }) {
  const { hasMinister, ministerSlug } = useManifest()
  const { showToast } = useToast()
  if (hasMinister(name)) {
    return (
      <Link
        href={`/minister/${ministerSlug(name)}`}
        onClick={e => e.stopPropagation()}
        className="text-[11px] font-mono underline-offset-2 hover:underline"
        style={{ color: 'var(--accent)' }}
      >
        {name}
      </Link>
    )
  }
  return (
    <button
      onClick={e => { e.stopPropagation(); showToast(`Profile for ${name} coming soon`) }}
      className="text-[11px] font-mono hover:underline text-left"
      style={{ color: 'var(--text2)' }}
    >
      {name}
    </button>
  )
}

// ── Tappable state name ───────────────────────────────────────────────────────
export function TappableState({ name }: { name: string }) {
  const { hasState, stateSlug } = useManifest()
  const { showToast } = useToast()
  if (hasState(name)) {
    return (
      <Link
        href={`/state/${stateSlug(name)}`}
        onClick={e => e.stopPropagation()}
        className="text-[11px] font-mono hover:underline underline-offset-2"
        style={{ color: 'var(--green)' }}
      >
        {name}
      </Link>
    )
  }
  return (
    <button
      onClick={e => { e.stopPropagation(); showToast(`State data for ${name} coming soon`) }}
      className="text-[11px] font-mono hover:underline text-left"
      style={{ color: 'var(--text2)' }}
    >
      {name}
    </button>
  )
}
