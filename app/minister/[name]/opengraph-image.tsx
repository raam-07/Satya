import { ImageResponse } from 'next/og'
import { api } from '@/lib/api'

export const runtime = 'edge'
export const alt = 'SatyaDheesh Minister Profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { name: string } }) {
  const minister = await api.minister(params.name).catch(() => null)
  const displayName = params.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const name = minister?.name ?? displayName

  const promises = minister?.promises ?? []
  const kept = promises.filter(p => p.status === 'kept').length
  const broken = promises.filter(p => p.status === 'broken').length
  const ongoing = promises.filter(p => p.status === 'ongoing').length

  const role = minister?.role || 'Political Leader'
  const party = minister?.party || ''

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
            <span style={{ fontSize: '54px', fontWeight: 'bold', color: '#FFF', fontFamily: serifFontFamily }}>
              {name}
            </span>
            <span style={{ fontSize: '22px', color: '#8E8E93', marginTop: '8px' }}>
              {[role, party].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', background: '#1C1C1E', padding: '20px 40px', borderRadius: '6px', borderLeft: '6px solid #1B7050' }}>
              <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#1B7050' }}>{kept}</span>
              <span style={{ fontSize: '14px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>Kept</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', background: '#1C1C1E', padding: '20px 40px', borderRadius: '6px', borderLeft: '6px solid #B02828' }}>
              <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#B02828' }}>{broken}</span>
              <span style={{ fontSize: '14px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>Broken</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', background: '#1C1C1E', padding: '20px 40px', borderRadius: '6px', borderLeft: '6px solid #BF4A07' }}>
              <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#BF4A07' }}>{ongoing}</span>
              <span style={{ fontSize: '14px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>Ongoing</span>
            </div>
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
