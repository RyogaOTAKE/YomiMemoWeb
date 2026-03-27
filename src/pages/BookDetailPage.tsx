import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Plus, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { StatusBadge } from '../components/StatusBadge'
import { BookForm } from '../components/BookForm'
import { MemoForm } from '../components/MemoForm'

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { books, deleteBook, deleteMemo, getMemosForBook, getMemoWithBooks } = useStore()

  const book = books.find(b => b.id === id)
  const memosWithBooks = id ? getMemosForBook(id) : []

  const [showBookEdit, setShowBookEdit] = useState(false)
  const [showMemoAdd, setShowMemoAdd] = useState(false)
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false)
  const [confirmDeleteMemoId, setConfirmDeleteMemoId] = useState<string | null>(null)

  if (!book) {
    return (
      <div className="page-container">
        <p>本が見つかりません</p>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>戻る</button>
      </div>
    )
  }

  function handleDeleteBook() {
    deleteBook(book!.id)
    navigate('/')
  }

  const editingMemo = editingMemoId ? getMemoWithBooks(editingMemoId) : null

  return (
    <>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* ヘッダー */}
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBookEdit(true)}>
              <Edit size={16} />
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteBook(true)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="page-container" style={{ paddingTop: '8px' }}>
          {/* 本の情報 */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="flex items-center justify-between mb-3">
              <StatusBadge status={book.status} />
              {book.publishedYear && (
                <span className="text-xs text-muted">{book.publishedYear}年</span>
              )}
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.4, marginBottom: '6px' }}>
              {book.title}
            </h1>

            {book.author && (
              <p className="text-muted" style={{ marginBottom: '8px' }}>{book.author}</p>
            )}

            {book.finishedAt && (
              <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>
                📅 読了日: {new Date(book.finishedAt).toLocaleDateString('ja-JP')}
              </p>
            )}

            {book.isbn && (
              <p className="text-xs text-muted">ISBN: {book.isbn}</p>
            )}

            {book.sourceUrl && (
              <a
                href={book.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '12px', display: 'inline-flex' }}
              >
                <ExternalLink size={14} />
                リンクを開く
              </a>
            )}
          </div>

          {/* メモ一覧 */}
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
              メモ ({memosWithBooks.length})
            </h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowMemoAdd(true)}>
              <Plus size={14} />
              メモを追加
            </button>
          </div>

          {memosWithBooks.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="text-muted text-sm">まだメモがありません</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memosWithBooks.map(({ memo, books: memoBooks }) => (
                <div key={memo.id} className="card">
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, marginBottom: '10px' }}>
                    {memo.body}
                  </p>

                  {/* 紐づく本（この本以外も表示） */}
                  {memoBooks.filter(b => b.id !== id).length > 0 && (
                    <div className="flex gap-2 flex-wrap" style={{ marginBottom: '10px' }}>
                      {memoBooks.filter(b => b.id !== id).map(b => (
                        <span key={b.id} className="chip text-xs"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/books/${b.id}`)}
                        >
                          {b.title}
                        </span>
                      ))}
                    </div>
                  )}

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
                        onClick={() => setConfirmDeleteMemoId(memo.id)}
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

      {/* 本の編集フォーム */}
      {showBookEdit && (
        <BookForm book={book} onClose={() => setShowBookEdit(false)} />
      )}

      {/* メモ追加フォーム */}
      {showMemoAdd && (
        <MemoForm defaultBookId={book.id} onClose={() => setShowMemoAdd(false)} />
      )}

      {/* メモ編集フォーム */}
      {editingMemoId && editingMemo && (
        <MemoForm
          memo={editingMemo.memo}
          initialBooks={editingMemo.books}
          onClose={() => setEditingMemoId(null)}
        />
      )}

      {/* 本削除確認 */}
      {confirmDeleteBook && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '360px' }}>
            <h2 className="modal-title" style={{ marginBottom: '12px' }}>本を削除しますか？</h2>
            <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
              「{book.title}」とこの本にのみ紐づくメモを削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-2 justify-between">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteBook(false)}>
                キャンセル
              </button>
              <button className="btn btn-danger" onClick={handleDeleteBook}>
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メモ削除確認 */}
      {confirmDeleteMemoId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '360px' }}>
            <h2 className="modal-title" style={{ marginBottom: '12px' }}>メモを削除しますか？</h2>
            <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
              この操作は取り消せません。
            </p>
            <div className="flex gap-2 justify-between">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteMemoId(null)}>
                キャンセル
              </button>
              <button className="btn btn-danger" onClick={() => {
                deleteMemo(confirmDeleteMemoId)
                setConfirmDeleteMemoId(null)
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
