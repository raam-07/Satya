import { api } from '@/lib/api'

// Open dataset of every tracked promise. Free to reuse with credit (CC BY 4.0):
// "Source: SatyaDheesh promise tracker (satyadheesh.in)". Each row links to its page, so
// anyone citing the data links back to the evidence.
export const DATASET_LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
export const DATASET_CITATION = 'SatyaDheesh promise tracker (https://satyadheesh.in/vaade)'

export type PromiseRow = {
  id: string; person: string; party: string; role: string; promise: string; category: string
  status: string; made_on: string; deadline: string; last_status_change: string
  evidence_count: number; source_url: string; satyadheesh_url: string
}

export async function promiseRows(): Promise<PromiseRow[]> {
  const data = await api.promises()
  const all = [
    ...(data?.by_status?.kept ?? []), ...(data?.by_status?.broken ?? []),
    ...(data?.by_status?.ongoing ?? []), ...(data?.by_status?.void ?? []),
  ]
  return all
    .filter(p => p.id && p.promise)
    .map(p => ({
      id: String(p.id),
      person: p.person || '',
      party: p.party || '',
      role: p.role || '',
      promise: p.promise || '',
      category: p.category || '',
      status: p.status || '',
      made_on: p.made_on || '',
      deadline: p.deadline || '',
      last_status_change: p.status_history?.length ? p.status_history[p.status_history.length - 1].changed_at : '',
      evidence_count: Number(p.evidence_count ?? p.evidence_articles?.length ?? 0),
      source_url: p.source_url || p.url || '',
      satyadheesh_url: `https://satyadheesh.in/vaade/${p.id}`,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
}

export function toCsv(rows: PromiseRow[]): string {
  const cols = Object.keys(rows[0] ?? { id: '' }) as (keyof PromiseRow)[]
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n'
}
