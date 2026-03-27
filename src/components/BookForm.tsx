import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { BookEntity, BookStatus } from '../types/models'
import { BOOK_STATUS_ORDER, BOOK_STATUS_LABELS } from '../types/models'
import { useStore } from '../store/useStore'

interface BookFormProps {
  book?: BookEntity   // 編集時に渡す（なければ新規作成）
  onClose: () => void
}

export function BookForm({ book, onClose }: BookFormProps) {
  const { addBook, updateBook } = useStore()

  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [publishedYear, setPublishedYear] = useState(
    book?.publishedYear?.toString() ?? ''
  )
  const [status, setStatus] = useState<BookStatus>(book?.status ?? 'UNREAD')
  const [isbn, setIsbn] = useState(book?.isbn ?? '')
  const [sourceUrl, setSourceUrl] = useState(book?.sourceUrl ?? '')
  const [finishedDate, setFinishedDate] = useState(
    book?.finishedAt ? new Date(book.finishedAt).toISOString().slice(0, 10) : ''
  )
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }

    const year = publishedYear ? parseInt(publishedYear, 10) : null
    const finishedAt = status === 'FINISHED' && finishedDate
      ? new Date(finishedDate).getTime()
      : (status === 'FINISHED' && book?.finishedAt ? book.finishedAt : null)

    const data = {
      title: title.trim(),
      author: author.trim() || null,
      publishedYear: year,
      status,
      isbn: isbn.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      finishedAt: finishedAt,
      asin: book?.asin ?? null,
      coverUri: book?.coverUri ?? null,
    }

    if (book) {
      updateBook(book.id, data)
    } else {
      addBook(data)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{book ? '本を編集' : '本を追加'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">タイトル *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="本のタイトル"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">著者</label>
            <input
              className="form-input"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="著者名"
            />
          </div>

          <div className="form-group">
            <label className="form-label">出版年</label>
            <input
              className="form-input"
              type="number"
              value={publishedYear}
              onChange={e => setPublishedYear(e.target.value)}
              placeholder="2024"
              min="1900"
              max="2099"
            />
          </div>

          <div className="form-group">
            <label className="form-label">ステータス</label>
            <select
              className="form-select"
              value={status}
              onChange={e => setStatus(e.target.value as BookStatus)}
            >
              {BOOK_STATUS_ORDER.map(s => (
                <option key={s} value={s}>{BOOK_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {status === 'FINISHED' && (
            <div className="form-group">
              <label className="form-label">読了日</label>
              <input
                className="form-input"
                type="date"
                value={finishedDate}
                onChange={e => setFinishedDate(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">ISBN</label>
            <input
              className="form-input"
              value={isbn}
              onChange={e => setIsbn(e.target.value)}
              placeholder="978-4-..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL（Amazon / 出版社など）</label>
            <input
              className="form-input"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {error && <p className="text-error text-sm mb-4">{error}</p>}

          <div className="flex gap-2 justify-between">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary">
              {book ? '保存' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
