import { ImageResponse } from 'next/og'
import { loadOgFont } from '@/lib/ogFont'
import { api } from '@/lib/api'
import { cleanTitle } from '@/lib/utils'

export const runtime = 'edge'
export const alt = 'SatyaDheesh Event Timeline'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function epochToDate(ts?: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function Image({ params }: { params: { slug: string } }) {
  const event = await api.eventTimeline(decodeURIComponent(params.slug)).catch(() => null)

  // Load fonts locally
  const [dmSansData, playfairData] = await Promise.all([
    loadOgFont(new URL('../../../public/fonts/DMSans-Regular.ttf', import.meta.url)),
    loadOgFont(new URL('../../../public/fonts/PlayfairDisplay-Bold.ttf', import.meta.url)),
  ])

  const fonts: any[] = []
  if (dmSansData) {
    fonts.push({ name: 'DM Sans', data: dmSansData, weight: 400, style: 'normal' })
  }
  if (playfairData) {
    fonts.push({ name: 'Playfair Display', data: playfairData, weight: 700, style: 'normal' })
  }

  const defaultFontFamily = dmSansData ? '"DM Sans"' : 'sans-serif'
  const serifFontFamily = playfairData ? '"Playfair Display"' : (dmSansData ? '"DM Sans"' : 'serif')

  if (!event) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0F0F10', color: '#FFF', alignItems: 'center', justifyContent: 'center', fontFamily: defaultFontFamily }}>
          SatyaDheesh Event Timelines
        </div>
      ),
      { ...size, fonts }
    )
  }

  const ongoing = event.state === 'open'
  const color = ongoing ? '#BF4A07' : '#1B7050'
  const title = cleanTitle(event.title)
  const range = `${epochToDate(event.first_seen)} — ${epochToDate(event.last_seen)}`

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0F0F10', color: '#FFF', padding: '60px', fontFamily: defaultFontFamily, justifyContent: 'space-between', borderTop: `16px solid ${color}` }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ background: color, color: '#FFF', fontSize: '18px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {ongoing ? 'Ongoing story' : 'Complete timeline'}
            </span>
            <span style={{ fontSize: '20px', color: '#8E8E93', fontWeight: 500 }}>
              {event.article_count} updates · {range}
            </span>
          </div>
          <div style={{ fontSize: '46px', fontWeight: 'bold', lineHeight: 1.3, color: '#FFF', marginTop: '10px', fontFamily: serifFontFamily }}>
            {title}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2C2C2E', paddingTop: '30px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.2em', color: '#D4AF37' }}>
            SATYADHEESH
          </span>
          <span style={{ fontSize: '18px', color: '#8E8E93' }}>
            The full story, milestone by milestone
          </span>
        </div>
      </div>
    ),
    { ...size, fonts }
  )
}
