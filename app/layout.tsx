import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { Shell } from '@/components/Shell'
import { ManifestProvider } from '@/lib/ManifestContext'
import { ToastProvider } from '@/lib/ToastContext'

import { JsonLd } from '@/components/JsonLd'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#FAF8F5',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://satyadheesh.in'),
  title: {
    default: 'SatyaDheesh — Track Every Political Promise in India',
    template: '%s | SatyaDheesh',
  },
  description: "They promised. Did they deliver? SatyaDheesh holds India's leaders to their word — sourced verdicts on every promise. The record they hoped you'd forget.",
  keywords: [
    'SatyaDheesh', 'Satya Dheesh', 'Satyadheesha', 'Satyadhish', 'सत्यधीश', 'सत्य धीश',
    'Indian political promise tracker', 'neta accountability India', 'politician criminal records',
    'UPSC current affairs notes', 'UPSC prelims pointers', 'UPSC mains questions',
    'civic intelligence India', 'election promises verification', 'political event timelines'
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
  appleWebApp: {
    capable: true,
    title: 'SatyaDheesh',        // home-screen icon label on iOS
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'SatyaDheesh — Track Every Political Promise in India',
    description: "They promised. Did they deliver? SatyaDheesh holds India's leaders to their word — sourced verdicts on every promise. The record they hoped you'd forget.",
    url: 'https://satyadheesh.in',
    siteName: 'SatyaDheesh',
    images: [
      {
        url: 'https://satyadheesh.in/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SatyaDheesh — Track Every Political Promise in India',
      }
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SatyaDheesh — Track Every Political Promise in India',
    description: "They promised. Did they deliver? SatyaDheesh holds India's leaders to their word — sourced verdicts on every promise. The record they hoped you'd forget.",
    images: ['https://satyadheesh.in/opengraph-image'],
  },
}

export const revalidate = false

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "name": "SatyaDheesh",
  // Brand spelling/script variants people actually type — the legitimate,
  // Google-documented way to claim them (never keyword-stuff pages).
  "alternateName": [
    "Satya Dheesh",
    "Satyadheesh",
    "SatyaDheesha",
    "Satyadhish",
    "सत्यधीश",
    "सत्य धीश"
  ],
  "url": "https://satyadheesh.in",
  "logo": {
    "@type": "ImageObject",
    "url": "https://satyadheesh.in/favicons/gavel-180.png",
    "width": 180,
    "height": 180
  },
  "description": "Independent, 100% autonomous civic intelligence platform and promise tracker holding Indian leaders accountable with primary news evidence.",
  "slogan": "India's Ground Truth Record",
  "foundingDate": "2025-11-01",
  "knowsAbout": [
    "Indian Politics",
    "Political Promises",
    "Elections in India",
    "UPSC Current Affairs",
    "Minister Performance Records",
    "Event Timelines"
  ]
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "SatyaDheesh",
  "alternateName": ["Satya Dheesh", "Satyadheesh", "सत्यधीश"],
  "url": "https://satyadheesh.in",
  // Tells Google the site has its own search — eligible for the sitelinks
  // search box on brand queries.
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://satyadheesh.in/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaIdsString = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const gaIds = gaIdsString ? gaIdsString.split(',').map(id => id.trim()) : []
  const primaryId = gaIds[0]

  return (
    <html lang="en" style={{ backgroundColor: '#FAF8F5' }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('satya_splash_seen') === 'true') {
                  document.documentElement.classList.add('splash-seen');
                }
              } catch (e) {}
            `
          }}
        />
        <JsonLd data={orgJsonLd} />
        <JsonLd data={websiteJsonLd} />
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
      <body style={{ backgroundColor: '#FAF8F5' }}>
        <ServiceWorkerRegister />
        <ManifestProvider>
          <ToastProvider>
            <Shell>{children}</Shell>
          </ToastProvider>
        </ManifestProvider>
      </body>
    </html>
  )
}
