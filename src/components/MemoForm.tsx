import { useState, type FormEvent } from 'react'
import { X, Check } from 'lucide-react'
import type { MemoEntity, BookEntity } from '../types/models'
import { useStore } from '../store/useStore'

interface MemoFormProps {
  memo?: MemoEntity           // 編集時に渡す
  initialBooks?: BookEntity[] // 編集時の紐付き本
  defaultBookId?: string      // 新規作成時のデフォルト本
  onClose: () => void
}

export function MemoForm({ memo, initialBooks, defaultBookId, onClose }: MemoFormProps) {
  const { addMemo, updateMemo, books } = useStore()

  const [body, setBody] = useState(memo?.body ?? '')
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(
    initialBooks?.map(b => b.id) ??
    (defaultBookId ? [defaultBookId] : [])
  )
  const [bookSearch, setBookSearch] = useState('')
  const [error, setError] = useState('')

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    (b.author?.toLowerCase().includes(bookSearch.toLowerCase()) ?? false)
  )

  function toggleBook(bookId: string) {
    setSelectedBookIds(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) {
      setError('メモを入力してください')
      return
    }
    if (selectedBookIds.length === 0) {
      setError('本を1冊以上選択してください')
      return
    }

    if (memo) {
      updateMemo(memo.id, body.trim(), selectedBookIds)
    } else {
      addMemo(body.trim(), selectedBookIds)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxHeight: '95vh' }}>
        <div className="modal-header">
          <h2 className="modal-title">{memo ? 'メモを編集' : 'メモを追加'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">メモ *</label>
            <textarea
              className="form-textarea"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="読書メモを書いてください..."
              autoFocus
              style={{ minHeight: '140px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              本 *
              {selectedBookIds.length > 0 && (
                <span style={{ marginLeft: '8px', color: 'var(--color-primary)', fontWeight: 600 }}>
                  {selectedBookIds.length}冊選択中
                </span>
              )}
            </label>

            <div style={{ marginBottom: '8px' }}>
              <div className="search-bar" style={{ padding: '6px 10px' }}>
                <input
                  value={bookSearch}
                  onChange={e => setBookSearch(e.target.value)}
                  placeholder="本を検索..."
                />
              </div>
            </div>

            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1.5px solid var(--color-surface-variant)',
              borderRadius: 'var(--radius-md)',
            }}>
              {filteredBooks.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>
                  本が見つかりません
                </div>
              ) : (
                filteredBooks.map(book => {
                  const isSelected = selectedBookIds.includes(book.id)
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => toggleBook(book.id)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: isSelected ? 'var(--color-primary-container)' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--color-surface-variant)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-surface-variant)'}`,
                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isSelected && <Check size={12} color="white" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.title}
                        </div>
                        {book.author && (
                          <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                            {book.author}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {error && <p className="text-error text-sm mb-4">{error}</p>}

          <div className="flex gap-2 justify-between">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary">
              {memo ? '保存' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
