'use client'

import { useState } from 'react'

/**
 * Share row for a promise. WhatsApp and X are plain links, so they work before
 * any JavaScript loads; only "Copy link" needs the browser.
 */
export function PromiseShare({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked - the other two options still work */
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
