export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Masthead */}
      <div className="border-b-2 border-[var(--accent)] pb-6 mb-8 text-center">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[var(--text3)] uppercase mb-4">Est. 2024 · Vol. II</div>
        <h1 className="text-[48px] font-black font-serif tracking-[0.15em] uppercase text-[var(--text1)] leading-none">SatyaDheesh</h1>
        <div className="text-[20px] font-serif text-accent mt-2">सत्याधीश</div>
        <div className="text-[10px] font-mono tracking-[0.25em] text-[var(--text3)] uppercase mt-4">
          India's Ground Truth Record
        </div>
      </div>

      {/* What is SatyaDheesh */}
      <section className="mb-8">
        <h2 className="text-[14px] font-mono tracking-widest uppercase text-[var(--text2)] mb-3 border-b border-[var(--border-md)] pb-2">
          What is SatyaDheesh?
        </h2>
        <p className="text-[14px] leading-relaxed text-[var(--text1)]">
          SatyaDheesh (सत्याधीश — Sanskrit/Hindi for "lord of truth") is a newspaper-style civic intelligence platform for Indian citizens.
          It shows the unfiltered, sourced reality of India — politics, crime, economy, ministers, promises vs. reality —
          all backed by real news articles and primary sources.
        </p>
        <p className="text-[14px] leading-relaxed text-[var(--text1)] mt-3">
          No opinions. No editorials. Only sourced facts — every single data point linked back to where it came from.
        </p>
      </section>

      {/* How it works */}
      <section className="mb-8">
        <h2 className="text-[14px] font-mono tracking-widest uppercase text-[var(--text2)] mb-3 border-b border-[var(--border-md)] pb-2">
          How it Works
        </h2>
        <div className="space-y-4">
          {[
            { step: '01', title: 'Data Collection', desc: 'Articles are scraped from verified Indian news sources and processed into structured JSON.' },
            { step: '02', title: 'Source Verification', desc: 'Every claim links to an original news report, government document, or court order.' },
            { step: '03', title: 'Promise Tracking', desc: 'Politicians\' public promises are tracked against measurable outcomes with source citations.' },
            { step: '04', title: 'Sentiment Analysis', desc: 'Articles are tagged by sentiment, topic, party, and minister — purely from reported facts.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4">
              <span className="text-[11px] font-mono text-accent flex-shrink-0 w-6 pt-0.5">{step}</span>
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text1)] mb-1">{title}</h3>
                <p className="text-[12px] leading-relaxed text-[var(--text2)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data sources */}
      <section className="mb-8">
        <h2 className="text-[14px] font-mono tracking-widest uppercase text-[var(--text2)] mb-3 border-b border-[var(--border-md)] pb-2">
          Data Sources
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            'The Hindu', 'Indian Express', 'NDTV', 'Business Standard',
            'Supreme Court of India', 'CAG Reports', 'MoSPI', 'NCRB',
            'ADR (Association for Democratic Reforms)', 'Election Commission of India',
            'CMIE', 'RBI Monetary Policy Reports',
          ].map(source => (
            <div key={source} className="flex items-center gap-2 text-[11px] text-[var(--text2)]">
              <span className="text-accent text-[10px]">↗</span>
              {source}
            </div>
          ))}
        </div>
      </section>

      {/* Design principle */}
      <section className="mb-8 border border-[var(--border-md)] rounded-sm p-5 bg-[var(--surface)]">
        <p className="text-[13px] font-serif italic text-[var(--text2)] leading-relaxed border-l-2 border-accent pl-4">
          "Every single data point must show where it came from. No opinions. Only sourced facts."
        </p>
        <p className="text-[10px] font-mono text-[var(--text3)] mt-3">— Core Design Principle</p>
      </section>

      {/* AI & Legal Disclaimer */}
      <section className="mb-8 p-5 border border-dashed border-[var(--border-md)] rounded-sm bg-[var(--surface)]">
        <h2 className="text-[12px] font-mono tracking-widest uppercase text-[#B02828] mb-3">
          AI Ingestion & Legal Disclaimer
        </h2>
        <div className="text-[11px] leading-relaxed text-[var(--text2)] space-y-2.5">
          <p>
            <strong>Automated Processing:</strong> SatyaDheesh operates as an automated aggregator that uses artificial intelligence models to scrape, tag, categorize, and cross-reference civic news. Because classification is handled programmatically, parsing errors or misalignments can occasionally occur.
          </p>
          <p>
            <strong>No Editorial Claims:</strong> This platform does not write, edit, or assert independent news claims. All records are derived from third-party verified publishers and are directly linked to their primary source URLs, which remain the sole editorial authority and owner of the content.
          </p>
          <p>
            <strong>Disputes and Corrections:</strong> We value accountability and accuracy. If you identify a classification error, incorrect promise mapping, or outdated evidence link, please email us directly at <a href="mailto:thesatyadheesh@gmail.com" className="text-[var(--accent)] hover:underline">thesatyadheesh@gmail.com</a> for correction.
          </p>
        </div>
      </section>

      <div className="mt-10 pt-6 border-t border-[var(--border)] text-center space-y-4">
        <p className="text-[10px] font-mono text-[var(--text3)] tracking-wider">
          SatyaDheesh is an independent, non-partisan civic project. Not affiliated with any political party or media house.
        </p>
        <div className="pt-2">
          <a
            href="mailto:thesatyadheesh@gmail.com"
            className="inline-flex items-center justify-center px-5 py-2 border border-[var(--accent)] text-[11px] font-mono tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-200 uppercase rounded-sm"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  )
}
