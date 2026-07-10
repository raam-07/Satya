import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found | SatyaDheesh',
  description: 'The requested page could not be found on SatyaDheesh.',
  robots: {
    index: false,
  }
}

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <div className="border-b-2 border-[var(--accent)] pb-6 mb-8">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[var(--text3)] uppercase mb-4">
          Error 404
        </div>
        <h1 className="text-[48px] font-black font-display tracking-[0.15em] uppercase text-[var(--text1)] leading-none">
          Not Found
        </h1>
        <div className="text-[20px] font-serif text-accent mt-2">सत्याधीश</div>
        <div className="text-[10px] font-mono tracking-[0.25em] text-[var(--text3)] uppercase mt-4">
          India's Ground Truth Record
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--text2)] mb-8 font-mono">
        The requested political record, dynamic route, or document does not exist.
      </p>

      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2 border border-[var(--accent)] text-[11px] font-mono tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-200 uppercase rounded-sm"
        >
          Return to Ground Truth Feed
        </Link>
      </div>
    </div>
  )
}
