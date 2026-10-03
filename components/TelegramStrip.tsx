// One-line link to the Telegram channel, styled like the other link strips under a page intro.
export const STRIP = 'inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-semibold whitespace-nowrap text-[var(--text1)] hover:border-[var(--accent)] transition-colors'

export function TelegramStrip({ isHi, className = '' }: { isHi: boolean; className?: string }) {
  return (
    <a
      href="https://t.me/satyadheesh"
      target="_blank"
      rel="noopener noreferrer"
      className={`${STRIP} ${className}`}
      style={{ borderColor: 'var(--border-md)' }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="#229ED9" className="shrink-0">
        <path d="M21.9 4.3 18.6 19.9c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2L6 13.4 1.1 11.9c-1.1-.3-1.1-1.1.2-1.6L20.5 2.9c.9-.3 1.7.2 1.4 1.4z" />
      </svg>
      <span>{isHi ? 'टेलीग्राम: @satyadheesh' : 'Telegram: @satyadheesh'}</span>
      <span className="font-normal text-[var(--text3)] truncate">{isHi ? '· रोज़ 5 बजे पीडीएफ + क्विज़' : '· daily PDF + quiz, 5 AM'}</span>
    </a>
  )
}
