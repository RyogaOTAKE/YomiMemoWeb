import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, FileText } from 'lucide-react'
import { useStore } from '../store/useStore'
import { MemoForm } from '../components/MemoForm'

export function MemoListPage() {
  const navigate = useNavigate()
  const { getAllMemosWithBooks, getMemoWithBooks, deleteMemo } = useStore()

  const [showMemoAdd, setShowMemoAdd] = useState(false)
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const memosWithBooks = getAllMemosWithBooks()
  const editingMemo = editingMemoId ? getMemoWithBooks(editingMemoId) : null

  return (
    <>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="page-header">
          <h1 className="page-title">メモ</h1>
          <span className="text-muted text-sm">{memosWithBooks.length}件</span>
        </div>

        <div className="page-container" style={{ paddingTop: '8px' }}>
          {memosWithBooks.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} className="empty-state-icon" />
              <p className="font-medium">メモがありません</p>
              <p className="text-sm text-muted">右下のボタンからメモを追加してください</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memosWithBooks.map(({ memo, books }) => (
                <div key={memo.id} className="card">
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, marginBottom: '10px' }}>
                    {memo.body}
                  </p>

                  {/* 紐づく本 */}
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowMemoAdd(true)}>
        <Plus size={24} />
      </button>

      {showMemoAdd && <MemoForm onClose={() => setShowMemoAdd(false)} />}

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
