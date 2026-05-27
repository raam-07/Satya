export default function Loading() {
  return (
    <div 
      className="flex flex-col items-center justify-center px-4"
      style={{ 
        minHeight: '70dvh',
        background: 'var(--bg)' 
      }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Brand Logo pulsing */}
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg animate-pulse"
          style={{ 
            background: 'var(--text1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}
        >
          <span className="font-serif font-black text-[22px] text-white tracking-widest translate-x-[1px]">S</span>
        </div>

        {/* Minimal bouncing dots */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>

        {/* Premium minimal status line */}
        <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-[var(--text3)] mt-2">
          Accessing Ground Truth
        </span>
      </div>
    </div>
  )
}
