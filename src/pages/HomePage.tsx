import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, BookOpen } from 'lucide-react'
import { useStore } from '../store/useStore'
import { StatusBadge } from '../components/StatusBadge'
import { BookForm } from '../components/BookForm'
import type { BookStatus } from '../types/models'
import { BOOK_STATUS_LABELS, BOOK_STATUS_ORDER } from '../types/models'

export function HomePage() {
  const navigate = useNavigate()
  const { getBookCards } = useStore()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookStatus | null>(null)
  const [showBookForm, setShowBookForm] = useState(false)

  const cards = getBookCards(query, statusFilter)

  return (
    <>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* ヘッダー */}
        <div className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <div className="flex items-center justify-between">
            <h1 className="page-title">📚 よみメモ</h1>
            <span className="text-muted text-sm">{cards.length}冊</span>
          </div>
          {/* 検索 */}
          <div className="search-bar">
            <Search size={16} style={{ color: 'var(--color-on-surface-variant)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="本を検索..."
            />
          </div>
        </div>

        {/* ステータスフィルター */}
        <div className="filter-tabs">
          <button
            className={`filter-tab${statusFilter === null ? ' active' : ''}`}
            onClick={() => setStatusFilter(null)}
          >
            すべて
          </button>
          {BOOK_STATUS_ORDER.map(s => (
            <button
              key={s}
              className={`filter-tab${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            >
              {BOOK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* 本一覧 */}
        <div className="page-container" style={{ paddingTop: '8px' }}>
          {cards.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} className="empty-state-icon" />
              <p className="font-medium">本がありません</p>
              <p className="text-sm text-muted">
                {query ? '検索条件を変えてみてください' : '右下のボタンから本を追加してください'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cards.map(({ book, memoCount, latestMemoSnippet }) => (
                <div
                  key={book.id}
                  className="card"
                  onClick={() => navigate(`/books/${book.id}`)}
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={book.status} />
                    {book.publishedYear && (
                      <span className="text-xs text-muted">{book.publishedYear}年</span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.4, marginBottom: '4px' }}>
                    {book.title}
                  </h3>

                  {book.author && (
                    <p className="text-sm text-muted" style={{ marginBottom: '8px' }}>
                      {book.author}
                    </p>
                  )}

                  {latestMemoSnippet && (
                    <p className="text-sm" style={{
                      color: 'var(--color-on-surface-variant)',
                      backgroundColor: 'var(--color-surface-variant)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '8px',
                      fontStyle: 'italic',
                    }}>
                      "{latestMemoSnippet}{latestMemoSnippet.length >= 60 ? '...' : ''}"
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      📝 {memoCount}件のメモ
                    </span>
                    {book.finishedAt && (
                      <span className="text-xs text-muted">
                        · 読了: {new Date(book.finishedAt).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowBookForm(true)}>
        <Plus size={24} />
      </button>

      {showBookForm && (
        <BookForm onClose={() => setShowBookForm(false)} />
      )}
    </>
  )
}
