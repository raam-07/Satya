import type { EventSummary } from './api'

export function epochToDate(epoch?: number): string {
  if (!epoch) return ''
  try {
    return new Date(epoch * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export function epochToMonYear(epoch?: number): string {
  if (!epoch) return ''
  try {
    return new Date(epoch * 1000)
      .toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      .toUpperCase()
  } catch {
    return ''
  }
}

export function eventDaySpan(ev: Pick<EventSummary, 'first_seen' | 'last_seen'>): number {
  if (!ev.first_seen || !ev.last_seen) return 1
  return Math.max(1, Math.round((ev.last_seen - ev.first_seen) / 86400) + 1)
}

export function entityKeyLabel(key: string): string {
  return key
    .split('_')
    .map(w => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
