import type { Metadata } from 'next'

export const revalidate = false

export const metadata: Metadata = {
  title: "About SatyaDheesh — India's Ground Truth Record",
  description: "SatyaDheesh is an independent, non-partisan civic intelligence platform tracking political accountability in India with evidence.",
  alternates: {
    canonical: 'https://satyadheesh.in/about',
    languages: {
      'en-IN': 'https://satyadheesh.in/about',
      'hi-IN': 'https://satyadheesh.in/about?lang=hi',
      'x-default': 'https://satyadheesh.in/about',
    },
  },
}

const aboutFaqJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://satyadheesh.in/about#about",
      "url": "https://satyadheesh.in/about",
      "name": "About SatyaDheesh — India's Ground Truth Record",
      "inLanguage": ["en", "hi"],
      "isPartOf": {
        "@type": "WebSite",
        "@id": "https://satyadheesh.in/#website",
        "name": "SatyaDheesh",
        "url": "https://satyadheesh.in"
      },
      "description": "SatyaDheesh is an independent, 100% autonomous civic intelligence platform and promise tracker holding Indian leaders accountable with primary news evidence."
    },
    {
      "@type": "FAQPage",
      "@id": "https://satyadheesh.in/about#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is SatyaDheesh (also known as Satya, Satya Dheesh, SatyaDheesha, or सत्यधीश)?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SatyaDheesh (सत्याधीश — Sanskrit/Hindi for 'lord of truth') is an independent, non-partisan civic intelligence platform tracking Indian political promises, netas, event timelines, and UPSC current affairs with sourced primary evidence."
          }
        },
        {
          "@type": "Question",
          "name": "How does SatyaDheesh operate autonomously at zero infrastructure cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SatyaDheesh runs 100% autonomously around the clock using scheduled multi-shard serverless pipelines and high-efficiency local AI models (Gemma) to ingest, classify, analyze, and translate civic data without paid servers or operational overhead."
          }
        },
        {
          "@type": "Question",
          "name": "How does SatyaDheesh evaluate political promises?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Promises made by Indian political leaders are cataloged and audited against verifiable outcomes. Verdicts are classified as Kept, Broken, Ongoing, or Void, strictly linked to verified publisher reports, parliamentary data, and government records."
          }
        },
        {
          "@type": "Question",
          "name": "What is the UPSC Current Affairs section on SatyaDheesh?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The UPSC section extracts high-yield facts for Prelims and structured answer dimensions for Mains mapped directly to the GS1, GS2, GS3, and GS4 syllabus from daily civic news."
          }
        }
      ]
    }
  ]
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutFaqJsonLd).replace(/</g, '\\u003c') }}
      />
      {/* Masthead */}
      <div className="border-b-2 border-[var(--accent)] pb-6 mb-8 text-center">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[var(--text3)] uppercase mb-3">Est. Nov 2025 · Public Record</div>
        <h1 className="text-[44px] md:text-[52px] font-black font-display tracking-[0.12em] uppercase text-[var(--text1)] leading-none">SatyaDheesh</h1>
        <div className="text-[22px] font-serif text-[var(--accent)] mt-2">सत्याधीश</div>
        <div className="text-[10.5px] font-mono tracking-[0.25em] text-[var(--text3)] uppercase mt-3">
          India's Ground Truth Record · Independent Civic Intelligence
        </div>
      </div>

      {/* The Core Mission: The Record They Hoped You'd Forget */}
      <section className="mb-10">
        <h2 className="text-[13px] font-mono tracking-widest uppercase text-[var(--text3)] mb-3 border-b border-[var(--border-md)] pb-2">
          The Mission
        </h2>
        <h3 className="text-[24px] md:text-[28px] font-serif font-bold text-[var(--text1)] leading-tight mb-4">
          "The record they hoped you'd forget."
        </h3>
        <p className="text-[14.5px] leading-relaxed text-[var(--text1)] font-serif">
          In every Indian election, political leaders take to the podium with folded hands. They promise millions of jobs, cleaner rivers, hospitals in every district, lower inflation, and farm loan waivers.
        </p>
        <p className="text-[14.5px] leading-relaxed text-[var(--text1)] mt-3 font-serif">
          Five years later, the rally banners are torn down, the slogans fade into silence, and the electorate is asked to vote on memory. But memory is short, and propaganda is deafening.
        </p>
        <p className="text-[14.5px] leading-relaxed text-[var(--text1)] mt-3 font-serif font-medium">
          SatyaDheesh (सत्याधीश — <em>"Sovereign of Truth"</em>) exists so that promises made to the Indian citizen are never erased from history. We treat every political commitment as an auditable public contract between the citizen and the state.
        </p>
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
          Why SatyaDheesh Cannot Be Bought
        </h3>
        <p className="text-[13.5px] leading-relaxed text-[var(--text2)] mb-5">
          Most mainstream media houses in India rely heavily on corporate advertising conglomerates or government tender notices to stay solvent. When a newsroom’s payroll depends on the very power it is meant to question, truth becomes a calculated compromise.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
          <div className="p-4 rounded-sm bg-[#FAF8F5] border" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-mono font-bold text-[var(--accent)] mb-1">01 / INTEGRITY</div>
            <h4 className="text-[13.5px] font-bold text-[var(--text1)] mb-1.5">Zero Corporate Bias</h4>
            <p className="text-[12px] text-[var(--text2)] leading-relaxed">
              No venture capital. No corporate ads. No political sponsors. Because our operational architecture operates with near-zero overhead, our verdicts are never for sale.
            </p>
          </div>

          <div className="p-4 rounded-sm bg-[#FAF8F5] border" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-mono font-bold text-[var(--accent)] mb-1">02 / IMPARTIALITY</div>
            <h4 className="text-[13.5px] font-bold text-[var(--text1)] mb-1.5">Algorithmic Auditing</h4>
            <p className="text-[12px] text-[var(--text2)] leading-relaxed">
              Ingestion and classification run 24/7 on autonomous mathematical pipelines. We track BJP, Congress, AAP, TMC, and regional leaders under the exact same strict standard.
            </p>
          </div>

          <div className="p-4 rounded-sm bg-[#FAF8F5] border" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-mono font-bold text-[var(--accent)] mb-1">03 / EVIDENCE</div>
            <h4 className="text-[13.5px] font-bold text-[var(--text1)] mb-1.5">1-Click Verification</h4>
            <p className="text-[12px] text-[var(--text2)] leading-relaxed">
              Don’t take our word for it. Every single claim, criminal case, and verdict links directly to primary sources: court affidavits, Lok Sabha replies, and verified news copy.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Vitality Public Ledger */}
      <section className="mb-10 p-5 rounded-sm border bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Public Ledger</span>
            <h3 className="text-[17px] font-bold text-[var(--text1)]">Platform Vitality & Coverage</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[var(--green)] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] inline-block"></span>
            Autonomous Pipeline Active
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="p-3 border rounded-sm bg-[#FAF8F5]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[22px] font-black font-mono text-[var(--text1)]">30,000+</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-0.5">Articles Monitored</div>
          </div>
          <div className="p-3 border rounded-sm bg-[#FAF8F5]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[22px] font-black font-mono text-[var(--accent)]">2,395</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-0.5">Active Timelines</div>
          </div>
          <div className="p-3 border rounded-sm bg-[#FAF8F5]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[22px] font-black font-mono text-[var(--green)]">688</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-0.5">UPSC Syllabus Notes</div>
          </div>
          <div className="p-3 border rounded-sm bg-[#FAF8F5]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[22px] font-black font-mono text-[var(--text1)]">1,046+</div>
            <div className="text-[9.5px] font-mono uppercase text-[var(--text3)] mt-0.5">Hindi Records</div>
          </div>
        </div>
      </section>

      {/* How Verdicts Are Decided */}
      <section id="verdicts" className="mb-10 scroll-mt-20">
        <h2 className="text-[13px] font-mono tracking-widest uppercase text-[var(--text3)] mb-3 border-b border-[var(--border-md)] pb-2">
          The Epistemic Standard · How Verdicts Are Decided
        </h2>
        <p className="text-[13px] text-[var(--text2)] leading-relaxed mb-4">
          To eliminate subjective judgment, SatyaDheesh operates on rigorous, published assessment rules:
        </p>

        <div className="space-y-3.5">
          {[
            { word: 'Kept', color: '#1B7050', desc: 'Delivered according to primary evidence. When no explicit deadline was set, a promise is marked kept only after five continuous years of monitoring, because initial inaugurations can be quietly abandoned.' },
            { word: 'Broken', color: '#B02828', desc: 'Not delivered by the leader\'s declared deadline. Where no deadline was stated, the commitment is formally audited three years after the date it was publicly uttered.' },
            { word: 'Ongoing', color: '#BF4A07', desc: 'Active policy implementation is underway, the deadline has not expired, or the delivery is undergoing verification against statutory metrics.' },
            { word: 'Void', color: '#6B7280', desc: 'Ineligible for adjudication (e.g. the party lost the election and lacks governing power, or the statement was non-measurable political rhetoric).' },
          ].map(({ word, color, desc }) => (
            <div key={word} className="flex gap-4 p-3 rounded-sm border bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
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
            <div key={source} className="flex items-center gap-2 text-[11px] text-[var(--text2)] bg-[var(--surface)] p-2 border rounded-sm" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[var(--accent)] text-[10px]">↗</span>
              {source}
            </div>
          ))}
        </div>
      </section>

      {/* Corrections, Disputes & Citizen Audits */}
      <section className="mb-8 p-5 border border-dashed border-[var(--border-md)] rounded-sm bg-[var(--surface)]">
        <h3 className="text-[12px] font-mono tracking-widest uppercase text-[var(--accent)] mb-2 font-bold">
          Accountability to You: Corrections & Dispute Policy
        </h3>
        <p className="text-[12px] leading-relaxed text-[var(--text2)] mb-3">
          We believe true accountability requires accountability to the public. If you are an elected official, political party representative, journalist, or concerned citizen and identify an outdated evidence link or factual correction:
        </p>
        <p className="text-[12px] leading-relaxed text-[var(--text2)]">
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
