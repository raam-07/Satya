import React from 'react'

// Strip " - Source Name" from end of titles
export function cleanTitle(title: string): string {
  return title.replace(/\s[-|]\s[^-|]+$/, '').trim()
}

// Format scraped_at: "2026-05-22 20:00:24.051627" → "May 22" or "2 days ago"
export function formatDate(scraped_at?: string): string {
  if (!scraped_at) return ''
  try {
    const d = new Date(scraped_at.replace(' ', 'T'))
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
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

// Render **bold** markdown tags as <strong> elements in React
export function renderMarkdown(text?: string): React.ReactNode[] | string {
  if (!text) return ''
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return React.createElement('strong', { key: idx, className: 'font-bold' }, part)
    }
    return part
  })
}
