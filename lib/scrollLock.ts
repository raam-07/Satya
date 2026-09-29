// Shared body scroll lock. Several overlays (splash, search, article modal) lock scrolling;
// writing document.body.style.overflow directly lets one overlay unlock another's lock, or
// re-lock after it closed. Each caller takes a lock and releases it; the page scrolls again
// only when every lock is released.
let locks = 0

export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {}
  locks += 1
  document.body.style.overflow = 'hidden'
  let released = false
  return () => {
    if (released) return
    released = true
    locks = Math.max(0, locks - 1)
    if (locks === 0) document.body.style.overflow = ''
  }
}
