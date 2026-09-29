import { ImageResponse } from 'next/og'
import { loadOgFont } from '@/lib/ogFont'

export const runtime = 'edge'
export const alt = 'SatyaDheesh — Track Every Political Promise in India'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const [dmSansData, playfairData] = await Promise.all([
    loadOgFont(new URL('../public/fonts/DMSans-Regular.ttf', import.meta.url)),
    loadOgFont(new URL('../public/fonts/PlayfairDisplay-Bold.ttf', import.meta.url)),
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#0D0E11',
          color: '#FAF8F5',
          padding: '64px',
          fontFamily: defaultFontFamily,
          justifyContent: 'space-between',
          border: '12px solid #1C1D22',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Top Brand Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <span
              style={{
                fontSize: '14px',
                fontFamily: defaultFontFamily,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: '#BF4A07',
                background: 'rgba(191,74,7,0.12)',
                padding: '6px 14px',
                borderRadius: '4px',
                border: '1px solid rgba(191,74,7,0.3)',
                fontWeight: 'bold',
              }}
            >
              Sovereign Civic Truth Ledger
            </span>
            <span style={{ fontSize: '14px', letterSpacing: '0.15em', color: '#8A857D', textTransform: 'uppercase' }}>
              Bharat · 24/7 Autonomous Audits
            </span>
          </div>

          {/* Main Title */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '16px' }}>
            <span
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                fontFamily: serifFontFamily,
                letterSpacing: '0.04em',
                color: '#FAF8F5',
              }}
            >
              SatyaDheesh
            </span>
            <span
              style={{
                fontSize: '34px',
                fontFamily: serifFontFamily,
                color: '#BF4A07',
                fontWeight: 'bold',
              }}
            >
              सत्याधीश
            </span>
          </div>

          {/* Subtitle / Hook */}
          <p
            style={{
              fontSize: '25px',
              lineHeight: 1.4,
              color: '#B5AFA6',
              maxWidth: '960px',
              marginTop: '4px',
              marginBottom: '32px',
            }}
          >
            They promised. Did they deliver? SatyaDheesh holds Indian leaders accountable to their word — sourced verdicts on every promise, affidavit, and timeline.
          </p>

          {/* Feature Badges */}
          <div style={{ display: 'flex', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#181A20',
                padding: '12px 22px',
                borderRadius: '6px',
                borderLeft: '4px solid #1B7050',
              }}
            >
              <span style={{ fontSize: '15px', color: '#1B7050', fontWeight: 'bold' }}>✓</span>
              <span style={{ fontSize: '14px', color: '#E5E0D8', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                Manifestos & Promises Kept / Broken
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#181A20',
                padding: '12px 22px',
                borderRadius: '6px',
                borderLeft: '4px solid #BF4A07',
              }}
            >
              <span style={{ fontSize: '15px', color: '#BF4A07', fontWeight: 'bold' }}>⚖</span>
              <span style={{ fontSize: '14px', color: '#E5E0D8', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                Court Affidavits & Criminal Records
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#181A20',
                padding: '12px 22px',
                borderRadius: '6px',
                borderLeft: '4px solid #3B82F6',
              }}
            >
              <span style={{ fontSize: '15px', color: '#3B82F6', fontWeight: 'bold' }}>◈</span>
              <span style={{ fontSize: '14px', color: '#E5E0D8', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                Developing Political Timelines
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #23252E',
            paddingTop: '24px',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.15em', color: '#BF4A07' }}>
            SATYADHEESH.IN
          </span>
          <span style={{ fontSize: '14px', color: '#6F6A62', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            The Record They Hoped You'd Forget
          </span>
        </div>
      </div>
    ),
    { ...size, fonts }
  )
}
