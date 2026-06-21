import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Shell } from '@/components/Shell'
import { ManifestProvider } from '@/lib/ManifestContext'
import { ToastProvider } from '@/lib/ToastContext'

export const metadata: Metadata = {
  metadataBase: new URL('https://satyadheesh.in'),
  title: 'SatyaDheesh — सत्याधीश | India\'s Ground Truth Record',
  description: 'Unfiltered, sourced civic intelligence for Indian citizens.',
  icons: {
    icon: [
      { url: '/favicons/satyadheesh-gavel-angled.svg', type: 'image/svg+xml' },
      { url: '/favicons/gavel-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/gavel-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/favicons/gavel-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaIdsString = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const gaIds = gaIdsString ? gaIdsString.split(',').map(id => id.trim()) : []
  const primaryId = gaIds[0]

  return (
    <html lang="en">
      <head>
        {primaryId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${gaIds.map(id => `
                  gtag('config', '${id}', {
                    page_path: window.location.pathname,
                  });
                `).join('\n')}
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        <ManifestProvider>
          <ToastProvider>
            <Shell>{children}</Shell>
          </ToastProvider>
        </ManifestProvider>
      </body>
    </html>
  )
}
