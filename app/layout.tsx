import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Shell } from '@/components/Shell'
import { ManifestProvider } from '@/lib/ManifestContext'
import { ToastProvider } from '@/lib/ToastContext'

export const metadata: Metadata = {
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
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <html lang="en">
      <head>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
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
