/* Shared skeleton primitives for route-level loading.tsx files.
   Purely presentational — mirrors each page's layout so navigation feels
   like panels filling in, not blank page loads. */

export function SkLine({ w = '100%', h = 12, className = '' }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`sk ${className}`} style={{ width: w, height: h }} />
}

export function SkHeader({ maxW = 'md:max-w-3xl' }: { maxW?: string }) {
  return (
    <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
      <SkLine w={90} h={10} />
      <SkLine w={260} h={26} className="mt-2" />
      <SkLine w={200} h={12} className="mt-2" />
    </div>
  )
}

export function SkChipsRow() {
  return (
    <div className="flex gap-2 px-4 md:px-6 py-2.5 border-b overflow-hidden" style={{ borderColor: 'var(--border-md)' }}>
      {[52, 70, 76, 58, 54, 84].map((w, i) => (
        <SkLine key={i} w={w} h={26} />
      ))}
    </div>
  )
}

export function SkListRow({ lines = 2 }: { lines?: number }) {
  return (
    <div className="border-b px-4 md:px-6 py-4" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <SkLine w={54} h={16} />
        <SkLine w={40} h={16} />
        <SkLine w={90} h={10} />
      </div>
      <SkLine w="92%" h={14} />
      {lines > 1 && <SkLine w="70%" h={14} className="mt-1.5" />}
      <div className="flex gap-3 mt-2">
        <SkLine w={70} h={9} />
        <SkLine w={60} h={9} />
      </div>
    </div>
  )
}

export function SkListPage({ maxW = 'md:max-w-3xl', rows = 6, chips = true }: { maxW?: string; rows?: number; chips?: boolean }) {
  return (
    <div className={`${maxW} md:mx-auto`}>
      <SkHeader />
      {chips && <SkChipsRow />}
      {Array.from({ length: rows }).map((_, i) => (
        <SkListRow key={i} />
      ))}
    </div>
  )
}
