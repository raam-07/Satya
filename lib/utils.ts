import React from 'react'

export { slugify, partySlugify } from './slug'

// Strip markdown formatting (**bold**, *italics*, `code`) and " - Source Name" from end of titles
export function cleanTitle(title: string): string {
  if (!title) return ''
  const stripped = title
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
  return stripped.replace(/\s[-|]\s[^-|]+$/, '').trim()
}

// Format scraped_at: "2026-05-22 20:00:24.051627" → "May 22" or "2 days ago"
export function formatDate(scraped_at?: string): string {
  if (!scraped_at) return ''
  try {
    const normalized = scraped_at.replace(' ', 'T')
    const finalStr = normalized.endsWith('Z') ? normalized : normalized + 'Z'
    const d = new Date(finalStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    // Future timestamp (clock skew / timezone) — show the date, not 'Just now'
    if (diffMs < -60000) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffHrs < 1) return 'Just now'
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

// Map API category to display label
export function categoryLabel(cat?: string): string {
  const map: Record<string, string> = {
    politics: 'GOVERNANCE',
    crime: 'JUSTICE',
    economy: 'ECONOMY',
    international: 'WORLD',
    health: 'HEALTH',
    environment: 'ENVIRONMENT',
    education: 'EDUCATION',
    regional: 'REGIONAL',
    sports: 'SPORTS',
    other: 'GENERAL',
  }
  return cat ? (map[cat] ?? cat.toUpperCase()) : 'GENERAL'
}

// Party badge color
export function partyColor(party?: string): string {
  const map: Record<string, string> = {
    BJP:      '#FF6B00',
    INC:      '#1D4ED8',
    Congress: '#1D4ED8',
    AAP:      '#F59E0B',
    TMC:      '#16A34A',
    DMK:      '#DC2626',
  }
  return party ? (map[party] ?? '#6B7280') : '#6B7280'
}

// Sentiment color + symbol
export function sentimentStyle(s?: string) {
  if (s === 'positive') return { color: '#1B7050', symbol: 'S↑' }
  if (s === 'negative') return { color: '#B02828', symbol: 'S↓' }
  return { color: '#92400E', symbol: 'S→' }
}

// Check if image_url is valid
export function hasImage(url?: string): boolean {
  return !!url && url !== 'No image available' && url.startsWith('http')
}

// Render **bold** and *italics* markdown tags as JSX in React, auto-healing unmatched tags
export function renderMarkdown(text?: string): React.ReactNode[] | string {
  if (!text) return ''
  
  let cleaned = text.trim()
  
  // Close any unclosed bold tags (odd number of ** )
  const boldCount = (cleaned.match(/\*\*/g) || []).length
  if (boldCount % 2 !== 0) {
    cleaned += '**'
  }
  
  // Close any unclosed italic tags (odd number of single * )
  const temp = cleaned.replace(/\*\*/g, '')
  const italicCount = (temp.match(/\*/g) || []).length
  if (italicCount % 2 !== 0) {
    cleaned += '*'
  }

  // Parse bold and italics
  const boldParts = cleaned.split(/\*\*(.*?)\*\*/g)
  const result: React.ReactNode[] = []
  
  boldParts.forEach((boldPart, boldIdx) => {
    if (boldIdx % 2 === 1) {
      result.push(React.createElement('strong', { key: `b-${boldIdx}`, className: 'font-bold' }, boldPart))
    } else {
      const italicParts = boldPart.split(/\*(.*?)\*/g)
      italicParts.forEach((italicPart, italicIdx) => {
        if (italicIdx % 2 === 1) {
          result.push(React.createElement('em', { key: `i-${boldIdx}-${italicIdx}`, className: 'italic' }, italicPart))
        } else {
          result.push(italicPart)
        }
      })
    }
  })
  
  return result
}
