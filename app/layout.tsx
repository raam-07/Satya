import type { Metadata } from 'next'
import './globals.css'
import { Shell } from '@/components/Shell'
import { ManifestProvider } from '@/lib/ManifestContext'
import { ToastProvider } from '@/lib/ToastContext'

export const metadata: Metadata = {
  title: 'SatyaDheesh — सत्याधीश | India\'s Ground Truth Record',
  description: 'Unfiltered, sourced civic intelligence for Indian citizens.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
