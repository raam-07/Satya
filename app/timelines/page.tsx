import { api } from '@/lib/api'
import { TimelinesClient } from '@/components/TimelinesClient'
import type { Metadata } from 'next'

export const revalidate = 259200 // 3 days — timelines change only on stitch/daily-run for now

export const metadata: Metadata = {
  title: 'Timelines — Developing Political Stories Tracked Update by Update | SatyaDheesh',
  description:
    'Every developing Indian political story as a timeline: budget sessions, elections, scams, and policy battles tracked milestone by milestone with sources.',
  alternates: {
    canonical: 'https://satyadheesh.in/timelines',
  },
}

export default async function TimelinesPage() {
  const data = await api.eventsList()
  const events = data?.events ?? []

  const ongoing = events.filter(e => e.state === 'open').length

  return (
    <div className="md:max-w-3xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Section</span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">
          Timelines
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1">
          Every developing story, tracked update by update.
          {ongoing > 0 && (
            <span className="font-mono text-[11px] text-[var(--text3)]"> · {ongoing} ongoing</span>
          )}
        </p>
      </div>

      <TimelinesClient events={events} />
    </div>
  )
}
