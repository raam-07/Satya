'use client'

export function TopBar({ lastUpdated, onSearchOpen }: { lastUpdated?: string; onSearchOpen?: () => void }) {
  return (
    <header
      className="flex-shrink-0 flex items-center gap-4 px-6 bg-[var(--surface)] border-b relative"
      style={{ height: 56, borderColor: 'var(--border-md)' }}
    >
      {/* Accent stripe at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--accent)' }} />

      {/* Search trigger */}
      <button
        onClick={onSearchOpen}
        className="flex-1 max-w-sm flex items-center gap-2 bg-[var(--bg)] border rounded-sm px-3 py-1.5 hover:border-[var(--accent)] transition-colors text-left"
        style={{ borderColor: 'var(--border-md)' }}
      >
        <span className="text-[12px]" style={{ color: 'var(--text3)' }}>⌕</span>
        <span className="text-[12px] font-sans" style={{ color: 'var(--text3)' }}>Search ministers, parties, topics...</span>
      </button>

      {/* Live indicator */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 4px #1b7050' }} />
        <span className="text-[10px] font-mono font-semibold tracking-widest" style={{ color: 'var(--green)' }}>LIVE</span>
        {lastUpdated && (
          <>
            <span className="text-[10px]" style={{ color: 'var(--border-md)' }}>·</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>Updated {lastUpdated}</span>
          </>
        )}
      </div>
    </header>
  )
}
