import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'

// 12-hour ISR: ensures the entire page is pre-rendered statically and revalidates
// at most twice per day. Zero Turso DB read waste across thousands of crawler hits.
export const revalidate = 43200

export const metadata: Metadata = {
  title: "About SatyaDheesh — India's Sovereign Civic Truth Ledger",
  description: "SatyaDheesh (सत्याधीश) is India's independent, incorruptible civic intelligence engine tracking political promises, netas, and policy timelines with primary evidence.",
  alternates: {
    canonical: 'https://satyadheesh.in/about',
    languages: {
      'en-IN': 'https://satyadheesh.in/about',
      'hi-IN': 'https://satyadheesh.in/about?lang=hi',
      'x-default': 'https://satyadheesh.in/about',
    },
  },
  openGraph: {
    title: "About SatyaDheesh — India's Sovereign Civic Truth Ledger",
    description: "The record they hoped you'd forget. SatyaDheesh holds Indian power accountable through 24/7 autonomous intelligence and primary source audits.",
    url: 'https://satyadheesh.in/about',
    siteName: 'SatyaDheesh',
    type: 'website',
  },
}

const aboutFaqJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://satyadheesh.in/about#about",
      "url": "https://satyadheesh.in/about",
      "name": "About SatyaDheesh — India's Sovereign Civic Truth Ledger",
      "inLanguage": ["en", "hi"],
      "isPartOf": {
        "@type": "WebSite",
        "@id": "https://satyadheesh.in/#website",
        "name": "SatyaDheesh",
        "url": "https://satyadheesh.in"
      },
      "description": "SatyaDheesh (सत्याधीश) is an independent, incorruptible civic intelligence platform holding Indian political leadership accountable with verified primary evidence."
    },
    {
      "@type": "NewsMediaOrganization",
      "@id": "https://satyadheesh.in/#organization",
      "name": "SatyaDheesh",
      "alternateName": ["सत्याधीश", "Satya Dheesh", "Satya"],
      "url": "https://satyadheesh.in",
      "foundingDate": "2025-11",
      "ethicsPolicy": "https://satyadheesh.in/about#verdicts",
      "correctionsPolicy": "https://satyadheesh.in/about#corrections",
      "knowsAbout": ["Indian Politics", "Civic Accountability", "Political Promises", "UPSC Current Affairs", "Election Manifestos"]
    },
    {
      "@type": "FAQPage",
      "@id": "https://satyadheesh.in/about#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is SatyaDheesh (also known as Satya, Satya Dheesh, or सत्याधीश)?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SatyaDheesh (सत्याधीश — Sanskrit/Hindi for 'Sovereign of Truth') is an independent, non-partisan civic intelligence apparatus and promise tracker holding Indian elected leaders accountable with primary court affidavits, parliamentary records, and multi-source news archives."
          }
        },
        {
          "@type": "Question",
          "name": "Why is SatyaDheesh described as an incorruptible public ledger?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Unlike mainstream corporate media that relies on government advertising contracts and billionaire backers, SatyaDheesh operates on a hyper-efficient zero-cost architecture with no corporate sponsors, no political ads, and no venture capital. Its audits are governed strictly by mathematical algorithms and verifiable primary evidence."
          }
        },
        {
          "@type": "Question",
          "name": "How does SatyaDheesh audit political promises?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Promises made by political leaders across BJP, Congress, AAP, and regional parties are continuously audited against verified outcomes. Verdicts are classified as Kept, Broken, Ongoing, or Void based on published statutory criteria and verified official documentation."
          }
        },
        {
          "@type": "Question",
          "name": "What is the UPSC Current Affairs syllabus extraction on SatyaDheesh?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SatyaDheesh extracts high-yield facts for Prelims and structured multi-dimensional analysis for Mains mapped directly to the GS1, GS2, GS3, and GS4 syllabus from daily national events."
          }
        }
      ]
    }
  ]
}

export default async function AboutPage() {
  const stats = await api.publicLedgerStats()

  const articlesCount = stats?.articles_classified ? `${stats.articles_classified.toLocaleString()}+` : '40,000+'
  const timelinesCount = stats?.active_timelines ? `${stats.active_timelines.toLocaleString()}+` : '2,000+'
  const upscCount = stats?.upsc_notes ? `${stats.upsc_notes.toLocaleString()}+` : '690+'
  const hindiCount = stats?.hindi_records ? `${stats.hindi_records.toLocaleString()}+` : '2,200+'
  const promisesCount = stats?.promises_tracked ? stats.promises_tracked.toLocaleString() : '123'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutFaqJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Masthead */}
      <div className="border-b-2 border-[var(--accent)] pb-6 mb-8 text-center">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[var(--text3)] uppercase mb-3">
          Est. Nov 2025 · Sovereign Public Record of Bharat
        </div>
        <h1 className="text-[44px] md:text-[54px] font-black font-display tracking-[0.14em] uppercase text-[var(--text1)] leading-none">
          SatyaDheesh
        </h1>
        <div className="text-[24px] md:text-[26px] font-serif text-[var(--accent)] mt-2 font-bold tracking-wide">
          सत्याधीश
        </div>
        <div className="text-[11px] font-mono tracking-[0.22em] text-[var(--text3)] uppercase mt-3">
          The Supreme Sovereign of Civic Truth · The Incorruptible Memory of Indian Democracy
        </div>
      </div>

      {/* The Core Mission: The Record They Hoped You'd Forget */}
      <section className="mb-10">
        <h2 className="text-[13px] font-mono tracking-widest uppercase text-[var(--text3)] mb-3 border-b border-[var(--border-md)] pb-2">
          The Mission
        </h2>
        <h3 className="text-[26px] md:text-[30px] font-serif font-bold text-[var(--text1)] leading-tight mb-4">
          "The record they hoped you'd forget."
        </h3>
        <p className="text-[15px] leading-relaxed text-[var(--text1)] font-serif">
          In every Indian election cycle, political power takes to the podium with folded hands. Millions of jobs are conjured into existence, rivers are decreed clean, world-class hospitals are promised in every district, inflation is pledged to vanish, and farm loans are written off with the stroke of a pen.
        </p>
        <p className="text-[15px] leading-relaxed text-[var(--text1)] mt-3.5 font-serif">
          Five years later, the rally banners are torn down and slogans dissolve into the air. Corporate news networks construct artificial circuses, and 1.4 billion citizens are expected to cast their ballots on engineered amnesia.
        </p>
        <div className="my-5 p-4 border-l-4 border-[var(--accent)] bg-[var(--surface-alt)] font-serif italic text-[16px] text-[var(--text1)]">
          "SatyaDheesh does not forget. We do not negotiate with spin. We do not bow to power."
        </div>
        <p className="text-[15px] leading-relaxed text-[var(--text1)] font-serif font-medium">
          SatyaDheesh (सत्याधीश — <em>The Sovereign of Truth</em>) was forged as an impenetrable civic truth fortress. We treat every political commitment, manifesto pledge, cabinet decree, and parliamentary declaration as an unalterable, auditable contract between the citizen and the state.
        </p>
        <p className="text-[14px] leading-relaxed text-[var(--text2)] mt-3">
          We are not a news aggregator. We are not an opinion outlet. We are Indian democracy’s permanent, cryptographic-grade public record.
        </p>
      </section>

      {/* Platform Vitality Public Ledger (Real live stats, zero DB read waste via 12-hour ISR) */}
      <section className="mb-10 p-5 rounded-sm border bg-[var(--surface)] shadow-xs" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse"></span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Public Ledger</span>
            </div>
            <h3 className="text-[18px] font-bold text-[var(--text1)] mt-0.5">Platform Vitality & Coverage</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--green)] bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] inline-block"></span>
            Continuous Autonomous Pipeline Active
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 border rounded-sm bg-[#FAF8F5] dark:bg-[var(--surface-alt)]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[24px] md:text-[28px] font-black font-mono text-[var(--text1)] leading-none">{articlesCount}</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-1.5 font-bold">Classified Articles</div>
            <div className="text-[8.5px] font-mono text-[var(--text3)]">Monitored 24/7</div>
          </div>
          <div className="p-3.5 border rounded-sm bg-[#FAF8F5] dark:bg-[var(--surface-alt)]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[24px] md:text-[28px] font-black font-mono text-[var(--accent)] leading-none">{timelinesCount}</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-1.5 font-bold">Active Timelines</div>
            <div className="text-[8.5px] font-mono text-[var(--text3)]">Developing Sagas</div>
          </div>
          <div className="p-3.5 border rounded-sm bg-[#FAF8F5] dark:bg-[var(--surface-alt)]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[24px] md:text-[28px] font-black font-mono text-[var(--green)] leading-none">{upscCount}</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-1.5 font-bold">UPSC Syllabus Notes</div>
            <div className="text-[8.5px] font-mono text-[var(--text3)]">Prelims & Mains Facts</div>
          </div>
          <div className="p-3.5 border rounded-sm bg-[#FAF8F5] dark:bg-[var(--surface-alt)]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[24px] md:text-[28px] font-black font-mono text-[var(--text1)] leading-none">{hindiCount}</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-1.5 font-bold">Hindi Records</div>
            <div className="text-[8.5px] font-mono text-[var(--text3)]">Vernacular Sovereignty</div>
          </div>
        </div>

        {/* Extra Ledger Footnote */}
        <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-[var(--text2)] font-mono gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--accent)]">⚖️ {promisesCount} Audited Manifestos</span>
            <span>· Multi-party political commitments verified</span>
          </div>
          <Link href="/data" className="text-[var(--accent)] font-bold hover:underline inline-flex items-center gap-1">
            <span>Inspect Full Data Suite</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* The Independence Charter: Why SatyaDheesh Cannot Be Bought */}
      <section className="mb-10 p-6 rounded-sm border bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[var(--green)]"></span>
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[var(--accent)]">
            Independence Standard
          </span>
        </div>
        <h3 className="text-[22px] md:text-[26px] font-serif font-bold text-[var(--text1)] mb-3">
          Why SatyaDheesh Cannot Be Bought, Intimidated, or Silenced
        </h3>
        <p className="text-[14px] leading-relaxed text-[var(--text2)] mb-5">
          Most mainstream media houses in India rely heavily on government advertising tenders, corporate conglomerates, and political patronage to stay solvent. When a newsroom’s payroll depends on the very power it is meant to question, truth is reduced to a commercial transaction.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
          <div className="p-4 rounded-sm bg-[#FAF8F5] dark:bg-[var(--surface-alt)] border" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-mono font-bold text-[var(--accent)] mb-1">01 / ABSOLUTE SOVEREIGNTY</div>
            <h4 className="text-[13.5px] font-bold text-[var(--text1)] mb-1.5">Zero Corporate Masters</h4>
            <p className="text-[12px] text-[var(--text2)] leading-relaxed">
              No venture capital. No billionaire owners. No political sponsors. Because our autonomous architecture operates at near-zero overhead, our verdicts are never for sale.
            </p>
          </div>

          <div className="p-4 rounded-sm bg-[#FAF8F5] dark:bg-[var(--surface-alt)] border" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-mono font-bold text-[var(--accent)] mb-1">02 / UNBIASED MATHEMATICS</div>
            <h4 className="text-[13.5px] font-bold text-[var(--text1)] mb-1.5">Algorithmic Auditing</h4>
            <p className="text-[12px] text-[var(--text2)] leading-relaxed">
              Ingestion and classification run 24/7 on autonomous mathematical pipelines. We track the ruling coalition, the national opposition, and regional parties under the exact same unyielding standard.
            </p>
          </div>

          <div className="p-4 rounded-sm bg-[#FAF8F5] dark:bg-[var(--surface-alt)] border" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-mono font-bold text-[var(--accent)] mb-1">03 / IRON-CLAD PROVENANCE</div>
            <h4 className="text-[13.5px] font-bold text-[var(--text1)] mb-1.5">1-Click Verification</h4>
            <p className="text-[12px] text-[var(--text2)] leading-relaxed">
              Never take our word for it. Every single claim, criminal case, and promise verdict links directly to primary sources: court affidavits, Lok Sabha replies, and verified news copy.
            </p>
          </div>
        </div>
      </section>

      {/* Direct Portal Navigation Grid */}
      <section className="mb-10">
        <h2 className="text-[13px] font-mono tracking-widest uppercase text-[var(--text3)] mb-3 border-b border-[var(--border-md)] pb-2">
          Explore The Ground Truth Records
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/data"
            className="p-4 rounded-sm border bg-[var(--surface)] hover:border-[var(--accent)] transition-all group"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-[11px] font-mono text-[var(--accent)] font-bold mb-1">01 / PLATFORM DATA</div>
            <div className="font-bold text-[14px] text-[var(--text1)] group-hover:text-[var(--accent)] transition-colors">
              Civic Intelligence & Metrics →
            </div>
            <div className="text-[12px] text-[var(--text2)] mt-1">
              Explore national article volume, political coverage share, and real-time civic flags.
            </div>
          </Link>

          <Link
            href="/vaade"
            className="p-4 rounded-sm border bg-[var(--surface)] hover:border-[var(--accent)] transition-all group"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-[11px] font-mono text-[var(--accent)] font-bold mb-1">02 / PROMISE TRACKER</div>
            <div className="font-bold text-[14px] text-[var(--text1)] group-hover:text-[var(--accent)] transition-colors">
              Election Manifestos & Verdicts →
            </div>
            <div className="text-[12px] text-[var(--text2)] mt-1">
              Audit the status of promises made by PM Narendra Modi, Rahul Gandhi, Arvind Kejriwal, and others.
            </div>
          </Link>

          <Link
            href="/timelines"
            className="p-4 rounded-sm border bg-[var(--surface)] hover:border-[var(--accent)] transition-all group"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-[11px] font-mono text-[var(--accent)] font-bold mb-1">03 / TIMELINES</div>
            <div className="font-bold text-[14px] text-[var(--text1)] group-hover:text-[var(--accent)] transition-colors">
              Developing Civic Sagas →
            </div>
            <div className="text-[12px] text-[var(--text2)] mt-1">
              Track major national controversies, Supreme Court hearings, and state elections as they unfold.
            </div>
          </Link>

          <Link
            href="/upsc"
            className="p-4 rounded-sm border bg-[var(--surface)] hover:border-[var(--accent)] transition-all group"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-[11px] font-mono text-[var(--accent)] font-bold mb-1">04 / UPSC ENGINE</div>
            <div className="font-bold text-[14px] text-[var(--text1)] group-hover:text-[var(--accent)] transition-colors">
              GS Syllabus Extraction →
            </div>
            <div className="text-[12px] text-[var(--text2)] mt-1">
              High-yield facts for Prelims and structured dimensions for Mains mapped to GS1–GS4.
            </div>
          </Link>

          <Link
            href="/netas"
            className="p-4 rounded-sm border bg-[var(--surface)] hover:border-[var(--accent)] transition-all group"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-[11px] font-mono text-[var(--accent)] font-bold mb-1">05 / POLITICIANS</div>
            <div className="font-bold text-[14px] text-[var(--text1)] group-hover:text-[var(--accent)] transition-colors">
              Netas & Affidavits →
            </div>
            <div className="text-[12px] text-[var(--text2)] mt-1">
              Official ADR criminal declarations, educational background, wealth, and ministerial dossiers.
            </div>
          </Link>

          <Link
            href="/search"
            className="p-4 rounded-sm border bg-[var(--surface)] hover:border-[var(--accent)] transition-all group"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-[11px] font-mono text-[var(--accent)] font-bold mb-1">06 / ARCHIVE SEARCH</div>
            <div className="font-bold text-[14px] text-[var(--text1)] group-hover:text-[var(--accent)] transition-colors">
              Search {articlesCount} Articles →
            </div>
            <div className="text-[12px] text-[var(--text2)] mt-1">
              Query our comprehensive archive by politician, party, policy, or legal statute.
            </div>
          </Link>
        </div>
      </section>

      {/* How Verdicts Are Decided */}
      <section id="verdicts" className="mb-10 scroll-mt-20">
        <h2 className="text-[13px] font-mono tracking-widest uppercase text-[var(--text3)] mb-3 border-b border-[var(--border-md)] pb-2">
          The Epistemic Standard · How Verdicts Are Decided
        </h2>
        <p className="text-[13.5px] text-[var(--text2)] leading-relaxed mb-4">
          To eliminate subjective bias, SatyaDheesh operates on rigorous, published assessment rules:
        </p>

        <div className="space-y-3.5">
          {[
            { word: 'Kept', color: '#1B7050', desc: 'Delivered according to primary evidence. When no explicit deadline was set, a promise is marked kept only after five continuous years of monitoring, because initial ribbon-cuttings can be quietly abandoned.' },
            { word: 'Broken', color: '#B02828', desc: 'Not delivered by the leader\'s declared deadline. Where no deadline was stated, the commitment is formally audited three years after the date it was publicly uttered.' },
            { word: 'Ongoing', color: '#BF4A07', desc: 'Active policy implementation is underway, the deadline has not expired, or the delivery is undergoing verification against statutory metrics.' },
            { word: 'Void', color: '#6B7280', desc: 'Ineligible for adjudication (e.g. the party lost the election and lacks governing power, or the statement was non-measurable political rhetoric).' },
          ].map(({ word, color, desc }) => (
            <div key={word} className="flex gap-4 p-3.5 rounded-sm border bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider flex-shrink-0 w-16 pt-0.5" style={{ color }}>{word}</span>
              <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data sources */}
      <section className="mb-10">
        <h2 className="text-[13px] font-mono tracking-widest uppercase text-[var(--text3)] mb-3 border-b border-[var(--border-md)] pb-2">
          Institutional & Media Sources
        </h2>
        <p className="text-[12.5px] text-[var(--text2)] leading-relaxed mb-3">
          Our intelligence pipeline cross-references data against verified government repositories and accredited Indian publishers:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            'Supreme Court of India', 'CAG Audit Reports', 'Lok Sabha / Rajya Sabha Q&A',
            'MoSPI Statistical Data', 'Election Commission of India', 'ADR Affidavits',
            'Reserve Bank of India', 'NCRB Annual Reports', 'CMIE Economic Reports',
            'The Hindu', 'Indian Express', 'NDTV',
          ].map(source => (
            <div key={source} className="flex items-center gap-2 text-[11px] text-[var(--text2)] bg-[var(--surface)] p-2.5 border rounded-sm" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[var(--accent)] text-[10px]">↗</span>
              {source}
            </div>
          ))}
        </div>
      </section>

      {/* Corrections, Disputes & Citizen Audits */}
      <section id="corrections" className="mb-8 p-5 border border-dashed border-[var(--border-md)] rounded-sm bg-[var(--surface)]">
        <h3 className="text-[12px] font-mono tracking-widest uppercase text-[var(--accent)] mb-2 font-bold">
          Accountability to You: Corrections & Dispute Policy
        </h3>
        <p className="text-[12.5px] leading-relaxed text-[var(--text2)] mb-3">
          We believe true accountability requires accountability to the public. If you are an elected official, political party representative, journalist, or concerned citizen and identify an outdated evidence link or factual correction:
        </p>
        <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">
          Email our editorial desk at <a href="mailto:thesatyadheesh@gmail.com" className="text-[var(--accent)] font-mono font-bold hover:underline">thesatyadheesh@gmail.com</a> with the primary document URL. Every submitted correction is investigated against official records within 24 hours.
        </p>
      </section>

      <div className="mt-10 pt-6 border-t border-[var(--border)] text-center space-y-3">
        <p className="text-[10px] font-mono text-[var(--text3)] tracking-wider">
          SatyaDheesh is a public civic intelligence utility. Independent. Non-partisan. Verified by evidence.
        </p>
      </div>
    </div>
  )
}
