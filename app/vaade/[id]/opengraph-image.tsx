import { ImageResponse } from 'next/og'
import { api } from '@/lib/api'

export const runtime = 'edge'
export const alt = 'SatyaDheesh Promise Tracker'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { id: string } }) {
  const promiseId = decodeURIComponent(params.id)
  const data = await api.promises()
  const allPromises = [
    ...(data?.by_status?.broken  ?? []),
    ...(data?.by_status?.ongoing ?? []),
    ...(data?.by_status?.kept    ?? []),
    ...(data?.by_status?.void   ?? []),
  ]
  const promise = allPromises.find(p => String(p.id) === promiseId)

  if (!promise) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#1C1C1E', color: '#FFF', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          SatyaDheesh Promise Tracker
        </div>
      ),
      { ...size }
    )
  }

  const statusColors: Record<string, string> = {
    kept: '#1B7050',
    broken: '#B02828',
    ongoing: '#BF4A07',
    void: '#6B7280',
  }
  const color = statusColors[promise.status ?? ''] ?? '#6B7280'

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0F0F10', color: '#FFF', padding: '60px', fontFamily: 'sans-serif', justifyContent: 'space-between', borderTop: `16px solid ${color}` }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', fontFamily: 'sans-serif' }}>
            <span style={{ background: color, color: '#FFF', fontSize: '18px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {promise.status}
            </span>
            <span style={{ fontSize: '20px', color: '#8E8E93', fontWeight: '500' }}>
              {promise.person} ({promise.party})
            </span>
          </div>
          <div style={{ fontSize: '42px', fontWeight: 'bold', lineHeight: '1.35', color: '#FFF', marginTop: '10px' }}>
            "{promise.promise}"
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2C2C2E', paddingTop: '30px', fontFamily: 'sans-serif' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.2em', color: '#D4AF37' }}>
            SATYADHEESH
          </span>
          <span style={{ fontSize: '18px', color: '#8E8E93' }}>
            Track Every Political Promise in India
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
