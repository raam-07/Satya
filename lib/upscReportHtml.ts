// Print document for a UPSC report: the HTML Chromium turns into the PDF
// (served at /upsc/reports/print/...). Plain HTML on purpose: it must not carry the
// site's app shell, scripts or navigation, and must lay out cleanly on A4.
import { cleanTitle } from './utils'
import { nodeLabel } from './upsc'
import { POINTER_LABEL, EXAM_LABEL, PAPER_HINT } from '@/components/UpscCard'
import { POINTER_LABEL_HI, subjectName, type Report } from './upscReports'
import type { UpscItem } from './upsc'

const SITE = 'https://satyadheesh.in'

const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const EXAM_HI: Record<string, string> = { prelims: 'प्रीलिम्स', mains: 'मेन्स', both: 'प्रीलिम्स + मेन्स' }

const T = {
  en: {
    brand: 'SatyaDheesh · UPSC Current Affairs', notes: 'notes', updated: 'Updated', ist: 'IST',
    online: 'Read online, daily updates and Hindi edition', contents: 'Contents',
    top: 'Most important', why: 'Why in news', facts: 'Key facts', pointers: 'Prelims pointers',
    mainsQ: 'Mains question', practiceMains: 'Practice — Mains questions', revision: 'Prelims quick revision',
    source: 'Source', digest: (n: number, t: number) => `Exam digest: the ${n} most exam-relevant of ${t} notes this period, grouped by GS paper and subject.`,
    disclaimer: "Notes are generated automatically from SatyaDheesh's news feed and mapped to the UPSC CSE syllabus. Check facts against the original report or PIB before using them in an answer.",
  },
  hi: {
    brand: 'सत्यधीश · यूपीएससी करेंट अफेयर्स', notes: 'नोट्स', updated: 'अपडेट', ist: 'IST',
    online: 'ऑनलाइन पढ़ें, रोज़ाना अपडेट और अंग्रेज़ी संस्करण', contents: 'विषय सूची',
    top: 'सबसे महत्वपूर्ण', why: 'चर्चा में क्यों', facts: 'मुख्य तथ्य', pointers: 'प्रीलिम्स बिंदु',
    mainsQ: 'मेन्स प्रश्न', practiceMains: 'अभ्यास — मेन्स प्रश्न', revision: 'प्रीलिम्स त्वरित दोहराव',
    source: 'स्रोत', digest: (n: number, t: number) => `परीक्षा सार: इस अवधि के ${t} नोट्स में से ${n} सबसे उपयोगी, जीएस पेपर और विषय के अनुसार।`,
    disclaimer: 'नोट्स सत्यधीश के समाचार फ़ीड से स्वचालित रूप से तैयार किए जाते हैं और यूपीएससी सीएसई पाठ्यक्रम से जुड़े हैं। उत्तर में उपयोग करने से पहले तथ्यों का मूल रिपोर्ट या पीआईबी से मिलान करें।',
  },
}

function note(it: UpscItem, isHi: boolean, showDate: boolean) {
  const t = isHi ? T.hi : T.en
  const exam = isHi ? EXAM_HI[it.examType] : EXAM_LABEL[it.examType]
  const date = showDate
    ? new Date(it.publishedAt * 1000).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
    : ''
  const meta = [isHi ? '' : nodeLabel(it.subject, it.node), exam, date].filter(Boolean).map(esc).join(' · ')
  const pointers = it.pointers.filter(p => p?.text).map(p => {
    const label = (isHi ? POINTER_LABEL_HI[p.type] : POINTER_LABEL[p.type]) || ''
    return `<li>${label ? `<b>${esc(label)}:</b> ` : ''}${esc(p.text)}</li>`
  }).join('')
  return `<article class="note" id="a${it.articleId}">
  <div class="meta">${meta}</div>
  <h4>${esc(cleanTitle(it.title))}</h4>
  ${it.whyInNews ? `<p><span class="lbl">${t.why}:</span> ${esc(it.whyInNews)}</p>` : ''}
  ${it.factBox ? `<p><span class="lbl">${t.facts}:</span> ${esc(it.factBox)}</p>` : ''}
  ${pointers ? `<div class="lbl">${t.pointers}</div><ul class="ptr">${pointers}</ul>` : ''}
  ${it.mainsQuestion ? `<p class="mq"><span class="lbl">${t.mainsQ}:</span> ${esc(it.mainsQuestion)}</p>` : ''}
  <div class="src">${it.source ? `${t.source}: ${esc(it.source)} · ` : ''}<a href="${SITE}/news/${it.articleId}">satyadheesh.in/news/${it.articleId}</a></div>
</article>`
}

export function renderReportHtml(r: Report): string {
  const isHi = r.lang === 'hi'
  const t = isHi ? T.hi : T.en
  const multi = r.period.kind !== 'daily'
  const now = new Date()
  const updated = now.toLocaleString(isHi ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
  const paperCounts = r.groups.map(g => `${g.paper} ${g.count}`).join(' · ')
  const onlineUrl = `satyadheesh.in/upsc/reports${isHi ? '?lang=hi' : ''}`

  const contents = multi ? `<section class="box">
  <h3>${t.contents}</h3>
  <ul class="toc">${r.groups.map(g => `<li><b>${g.paper}</b> <span class="muted">${esc(isHi ? PAPER_HINT[g.paper]?.hi : PAPER_HINT[g.paper]?.en)}</span> — ${
    g.subjects.map(s => `${esc(subjectName(s.subject, isHi))} (${s.items.length})`).join(', ')}</li>`).join('')}</ul>
</section>` : ''

  const top = r.top.length ? `<section class="box">
  <h3>${t.top}</h3>
  <ol>${r.top.map(i => `<li>${esc(cleanTitle(i.title))} <span class="muted">· ${i.paper}</span></li>`).join('')}</ol>
</section>` : ''

  const body = r.groups.map(g => `<section class="paper">
  <h2>${g.paper} <span class="muted">· ${esc(isHi ? PAPER_HINT[g.paper]?.hi : PAPER_HINT[g.paper]?.en)} · ${g.count}</span></h2>
  ${g.subjects.map(s => `<h3 class="subj">${esc(subjectName(s.subject, isHi))}</h3>${s.items.map(i => note(i, isHi, multi)).join('')}`).join('')}
</section>`).join('')

  const mains = r.mains.length ? `<section class="practice">
  <h2>${t.practiceMains}</h2>
  <ol>${r.mains.map(i => `<li>${esc(i.mainsQuestion)} <span class="muted">· ${i.paper}</span></li>`).join('')}</ol>
</section>` : ''

  const revision = r.revision.length ? `<section class="practice">
  <h2>${t.revision}</h2>
  <ul class="rev">${r.revision.map(p => {
    const label = (isHi ? POINTER_LABEL_HI[p.type] : POINTER_LABEL[p.type]) || ''
    return `<li>${label ? `<b>${esc(label)}:</b> ` : ''}${esc(p.text)}</li>`
  }).join('')}</ul>
</section>` : ''

  const hiNote = isHi && r.hiShare < 0.999
    ? `<p class="muted small">इस रिपोर्ट में वे नोट्स हैं जिनका हिंदी अनुवाद तैयार है (${Math.round(r.hiShare * 100)}%)। बाकी नोट्स अंग्रेज़ी संस्करण में हैं।</p>`
    : ''

  return `<!doctype html>
<html lang="${isHi ? 'hi' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${esc(r.title)} | SatyaDheesh</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Serif:wght@700;900&family=Noto+Serif+Devanagari:wght@700;900&display=block" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: #1c1917; font: 10pt/1.42 'Noto Sans', 'Noto Sans Devanagari', sans-serif; orphans: 2; widows: 2; }
  :lang(hi) body, body:lang(hi) { font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif; line-height: 1.55; }
  h1, h2, h3 { font-family: 'Noto Serif', 'Noto Serif Devanagari', serif; margin: 0; }
  :lang(hi) h1, :lang(hi) h2, :lang(hi) h3 { font-family: 'Noto Serif Devanagari', 'Noto Serif', serif; }
  a { color: #9a3412; text-decoration: none; }
  .muted { color: #78716c; font-weight: 400; }
  .small { font-size: 8.5pt; }
  .cover { border-bottom: 3px solid #9a3412; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font: 600 9pt 'Noto Sans', 'Noto Sans Devanagari', sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #9a3412; }
  h1 { font-size: 22pt; line-height: 1.2; margin: 4px 0 6px; font-weight: 900; }
  .sub { font-size: 9.5pt; color: #57534e; }
  .box { border: 1px solid #e7e5e4; background: #fafaf9; border-radius: 6px; padding: 8px 12px; margin: 0 0 12px; break-inside: avoid; }
  .box h3 { font-size: 11pt; margin-bottom: 4px; }
  .box ol, .box ul { margin: 0; padding-left: 18px; }
  .toc { list-style: none; padding-left: 0 !important; }
  .toc li { margin: 2px 0; }
  .paper { margin-top: 10px; }
  .paper h2 { font-size: 15pt; border-bottom: 1px solid #d6d3d1; padding-bottom: 3px; margin: 14px 0 6px; break-after: avoid; }
  h3.subj { font-size: 11.5pt; color: #9a3412; margin: 10px 0 4px; break-after: avoid; }
  .note { border-left: 3px solid #e7e5e4; padding: 1px 0 1px 9px; margin: 0 0 8px; }
  .note .meta, .note h4 { break-after: avoid; }
  .note li { break-inside: avoid; }
  .note h4 { font-size: 10.5pt; margin: 1px 0 2px; line-height: 1.3; }
  .note p { margin: 2px 0; }
  .meta { font-size: 8pt; color: #78716c; }
  .lbl { font-weight: 700; color: #44403c; }
  div.lbl { margin-top: 3px; }
  ul.ptr { margin: 1px 0 2px; padding-left: 16px; }
  .mq { font-style: italic; }
  .src { font-size: 8pt; color: #78716c; margin-top: 2px; }
  .practice { break-before: page; }
  .practice h2 { font-size: 15pt; margin-bottom: 6px; }
  .practice ol li, .practice ul li { margin: 0 0 5px; break-inside: avoid; }
  .practice + .practice { break-before: auto; margin-top: 16px; }
  .end { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e7e5e4; font-size: 8.5pt; color: #57534e; }
</style>
</head>
<body>
<header class="cover">
  <div class="brand">${t.brand}</div>
  <h1>${esc(r.title)}</h1>
  <div class="sub">${r.selected} ${t.notes} · ${paperCounts} · ${t.updated} ${esc(updated)} ${t.ist}</div>
  <div class="sub">${t.online}: <a href="${SITE}/upsc/reports${isHi ? '?lang=hi' : ''}">${onlineUrl}</a></div>
  ${multi ? `<p class="muted small" style="margin:4px 0 0">${esc(t.digest(r.selected, r.totalNotes))}</p>` : ''}
  ${hiNote}
</header>
${contents}
${top}
${body}
${mains}
${revision}
<p class="end">${esc(t.disclaimer)}<br><b>SatyaDheesh</b> · <a href="${SITE}/upsc${isHi ? '?lang=hi' : ''}">satyadheesh.in/upsc</a></p>
</body>
</html>`
}
