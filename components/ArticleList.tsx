'use client'

import { useState, useCallback } from 'react'
import type { Article } from '@/lib/api'
import { ArticleCard } from './ArticleCard'
import { ArticleModal } from './ArticleModal'

interface ArticleListProps {
  articles: Article[]
  emptyMessage?: string
}

export function ArticleList({ articles, emptyMessage = 'No articles found' }: ArticleListProps) {
  const [modal, setModal] = useState<Article | null>(null)
  const openModal  = useCallback((a: Article) => setModal(a), [])
  const closeModal = useCallback(() => setModal(null), [])

  return (
    <>
      {articles.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-[13px] font-mono" style={{ color: 'var(--text3)' }}>{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {articles.map((a, i) => (
            <ArticleCard
              key={a.id ?? i}
              article={a}
              variant="default"
              onOpen={openModal}
            />
          ))}
        </div>
      )}
      <ArticleModal article={modal} onClose={closeModal} />
    </>
  )
}
