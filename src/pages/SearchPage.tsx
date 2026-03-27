import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Edit, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { MemoForm } from '../components/MemoForm'

export function SearchPage() {
  const navigate = useNavigate()
  const { searchMemos, getMemoWithBooks, deleteMemo } = useStore()

  const [query, setQuery] = useState('')
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const results = query.trim().length >= 1 ? searchMemos(query.trim()) : []
  const editingMemo = editingMemoId ? getMemoWithBooks(editingMemoId) : null

  return (
    <>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <h1 className="page-title">検索</h1>
          <div className="search-bar">
            <Search size={16} style={{ color: 'var(--color-on-surface-variant)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="メモを全文検索..."
              autoFocus
            />
          </div>
        </div>

        <div className="page-container" style={{ paddingTop: '8px' }}>
          {query.trim() === '' ? (
            <div className="empty-state">
              <Search size={48} className="empty-state-icon" />
              <p className="font-medium">キーワードを入力してください</p>
              <p className="text-sm text-muted">メモの本文を全文検索します</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <p className="font-medium">「{query}」に一致するメモが見つかりません</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>
                {results.length}件のメモが見つかりました
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.map(({ memo, books }) => {
                  // ハイライト処理
                  const lq = query.toLowerCase()
                  const idx = memo.body.toLowerCase().indexOf(lq)
                  let preview = memo.body
                  if (idx > -1) {
                    const start = Math.max(0, idx - 30)
                    const end = Math.min(memo.body.length, idx + query.length + 60)
                    preview = (start > 0 ? '...' : '') + memo.body.slice(start, end) + (end < memo.body.length ? '...' : '')
                  }

                  return (
                    <div key={memo.id} className="card">
                      <p style={{ lineHeight: 1.7, marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                        {preview}
                      </p>

                      <div className="flex gap-2 flex-wrap" style={{ marginBottom: '10px' }}>
                        {books.map(book => (
                          <span
                            key={book.id}
                            className="chip"
                            style={{ cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => navigate(`/books/${book.id}`)}
                          >
                            {book.title}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {new Date(memo.updatedAt).toLocaleDateString('ja-JP', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditingMemoId(memo.id)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setConfirmDeleteId(memo.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {editingMemoId && editingMemo && (
        <MemoForm
          memo={editingMemo.memo}
          initialBooks={editingMemo.books}
          onClose={() => setEditingMemoId(null)}
        />
      )}

      {confirmDeleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '360px' }}>
            <h2 className="modal-title" style={{ marginBottom: '12px' }}>メモを削除しますか？</h2>
            <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
              この操作は取り消せません。
            </p>
            <div className="flex gap-2 justify-between">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                キャンセル
              </button>
              <button className="btn btn-danger" onClick={() => {
                deleteMemo(confirmDeleteId)
                setConfirmDeleteId(null)
              }}>
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
