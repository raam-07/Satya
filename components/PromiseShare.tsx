'use client'

import { useState } from 'react'

/**
 * Share row for a promise. WhatsApp and X are plain links, so they work before
 * any JavaScript loads; only "Copy link" needs the browser.
 */
export function PromiseShare({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked - the other options still work */
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 h-8 px-3 text-[10px] font-mono font-semibold tracking-[0.12em] uppercase border transition-colors hover:bg-[var(--bg-alt)]'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btn} style={{ borderColor: 'var(--border-md)', color: 'var(--text1)' }}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        WhatsApp
      </a>
      <a href={telegram} target="_blank" rel="noopener noreferrer" className={btn} style={{ borderColor: 'var(--border-md)', color: 'var(--text1)' }}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
        </svg>
        Telegram
      </a>
      <a href={x} target="_blank" rel="noopener noreferrer" className={btn} style={{ borderColor: 'var(--border-md)', color: 'var(--text1)' }}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.2 2.25h3.4l-7.4 8.5L23 21.75h-6.8l-5.3-7-6.1 7H1.4l7.9-9.1L1 2.25h7l4.8 6.4 5.4-6.4Zm-1.2 17.5h1.9L7.1 4.2H5.1l11.9 15.55Z" />
        </svg>
        Post
      </a>
      <button type="button" onClick={copy} className={btn} style={{ borderColor: 'var(--border-md)', color: copied ? 'var(--green)' : 'var(--text1)' }}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  )
}
