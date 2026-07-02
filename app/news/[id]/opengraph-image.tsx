import { ImageResponse } from 'next/og'
import { api } from '@/lib/api'
import { cleanTitle } from '@/lib/utils'

export const runtime = 'edge'
export const alt = 'SatyaDheesh News Record'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { id: string } }) {
  const idNum = Number(params.id)
  const article = isNaN(idNum) ? null : await api.article(idNum).catch(() => null)
  const title = article ? cleanTitle(article.rephrased_title ?? article.title) : 'News Record Not Found'
  const source = article?.source || 'Verified Source'
  const category = article?.category || 'News'

  // Fetch fonts dynamically
  const [dmSansData, playfairData] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/dmsans/v15/r05L5VVo-2xqiCDMD-ALk7GF.ttf').then((res) =>
      res.arrayBuffer()
    ).catch(() => null),
    fetch('https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD7K2_7kVrHy087K3qPJ6mg95179wa1A.ttf').then((res) =>
      res.arrayBuffer()
    ).catch(() => null),
  ])

  const fonts: any[] = []
  if (dmSansData) {
    fonts.push({
      name: 'DM Sans',
      data: dmSansData,
      weight: 400,
      style: 'normal',
    })
  }
  if (playfairData) {
    fonts.push({
      name: 'Playfair Display',
      data: playfairData,
      weight: 700,
      style: 'normal',
    })
  }

  const defaultFontFamily = dmSansData ? '"DM Sans"' : 'sans-serif'
  const serifFontFamily = playfairData ? '"Playfair Display"' : (dmSansData ? '"DM Sans"' : 'serif')

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0F0F10', color: '#FFF', padding: '60px', fontFamily: defaultFontFamily, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
            <span style={{ fontSize: '20px', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '15px' }}>
              {category} · {source}
            </span>
            <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#FFF', fontFamily: serifFontFamily, lineHeight: '1.25' }}>
              {title}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2C2C2E', paddingTop: '30px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.2em', color: '#D4AF37' }}>
            SATYADHEESH
          </span>
          <span style={{ fontSize: '18px', color: '#8E8E93' }}>
            Verify Political Accountability with Evidence
          </span>
        </div>
      </div>
    ),
    { ...size, fonts }
  )
}
