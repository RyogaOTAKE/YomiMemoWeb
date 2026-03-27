// YondaLog Android アプリのデータモデルをTypeScriptで再現

export type BookStatus =
  | 'CONSIDERING_PURCHASE'
  | 'UNREAD'
  | 'READING'
  | 'FINISHED'

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  CONSIDERING_PURCHASE: '購入検討',
  UNREAD: '未読',
  READING: '読書中',
  FINISHED: '読了',
}

export const BOOK_STATUS_ORDER: BookStatus[] = [
  'CONSIDERING_PURCHASE',
  'UNREAD',
  'READING',
  'FINISHED',
]

export interface BookEntity {
  id: string
  title: string
  author: string | null
  publishedYear: number | null
  finishedAt: number | null
  sourceUrl: string | null
  isbn: string | null
  asin: string | null
  coverUri: string | null
  status: BookStatus
  createdAt: number
  updatedAt: number
}

export interface MemoEntity {
  id: string
  body: string
  createdAt: number
  updatedAt: number
}

export interface MemoBookCrossRef {
  memoId: string
  bookId: string
  createdAt: number
}

export interface SyncDeletedItem {
  type: string       // 'book' | 'memo' | 'memoBook'
  primaryId: string
  secondaryId: string
  deletedAt: number
}

export interface BackupJson {
  version: number
  exportedAt: number
  books: BookEntity[]
  memos: MemoEntity[]
  memoBooks: MemoBookCrossRef[]
  deletedItems: SyncDeletedItem[]
}

// UI用の複合型
export interface MemoWithBooks {
  memo: MemoEntity
  books: BookEntity[]
}

export interface BookCard {
  book: BookEntity
  memoCount: number
  latestMemoSnippet: string | null
}

// 月別統計
export interface MonthlyBookCount {
  month: string   // "YYYY-MM"
  count: number
}
