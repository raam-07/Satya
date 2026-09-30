import { api } from '@/lib/api'

// Embeddable promise card: <iframe src="https://satyadheesh.in/embed/vaade/<id>">.
// A route handler (not a page) so it renders without the site's masthead/nav.
// noindex: the real page is /vaade/<id>; the embed snippet also carries a plain link to it,
// which is the backlink.
export const revalidate = 3600

const TONE: Record<string, { color: string; word: string }> = {
  kept: { color: '#1B7050', word: 'Kept' },
  broken: { color: '#B02828', word: 'Broken' },
  ongoing: { color: '#BF4A07', word: 'Ongoing' },
  void: { color: '#6B7280', word: 'Void' },
}
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await api.promises()
  const all = [
    ...(data?.by_status?.broken ?? []), ...(data?.by_status?.ongoing ?? []),
    ...(data?.by_status?.kept ?? []), ...(data?.by_status?.void ?? []),
  ]
  const p = all.find(x => String(x.id) === params.id)
  if (!p) return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } })

  const tone = TONE[p.status || 'ongoing'] ?? TONE.ongoing
  const pageUrl = `https://satyadheesh.in/vaade/${encodeURIComponent(String(p.id))}`
  const text = String(p.promise || '')
  const promise = text.length > 220 ? text.slice(0, 217).trimEnd() + '…' : text
  const meta = [p.party, p.made_on ? `promised ${p.made_on}` : ''].filter(Boolean).join(' · ')

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(p.person)}: ${esc(tone.word)} — SatyaDheesh</title>
<style>
*{box-sizing:border-box}html,body{margin:0;background:transparent}
body{font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Devanagari",sans-serif;color:#1A1A1A}
a.card{display:block;text-decoration:none;color:inherit;border:1px solid #E5E0D8;border-left:4px solid ${tone.color};border-radius:10px;padding:12px 14px;background:#fff}
a.card:hover{border-color:${tone.color}}
.top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.badge{font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:${tone.color};padding:4px 7px;border-radius:5px}
.who{font-weight:700}.meta{font-size:12px;color:#666}
.q{margin:8px 0 10px;font-family:Georgia,serif;font-size:15px}
.foot{font-size:12px;color:${tone.color};font-weight:600}
@media (prefers-color-scheme:dark){body{color:#eee}a.card{background:#1d1c1a;border-color:#34312d}.meta{color:#aaa}}
</style></head><body>
<a class="card" href="${pageUrl}" target="_blank" rel="noopener">
<div class="top"><span class="badge">${esc(tone.word)}</span><span class="who">${esc(p.person)}</span><span class="meta">${esc(meta)}</span></div>
<p class="q">“${esc(promise)}”</p>
<div class="foot">See the evidence on SatyaDheesh →</div>
</a></body></html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Content-Security-Policy': "frame-ancestors *",
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
