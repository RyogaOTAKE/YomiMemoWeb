// Zustand による全体状態管理
// Android の Room DB + Repository 相当の役割

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  BookEntity,
  MemoEntity,
  MemoBookCrossRef,
  SyncDeletedItem,
  BackupJson,
  BookStatus,
  BookCard,
  MemoWithBooks,
  MonthlyBookCount,
} from '../types/models'
import { mergeBackups } from '../lib/syncMerger'
import { getDriveClient } from '../lib/driveApi'

// クライアントIDは .env の VITE_GOOGLE_CLIENT_ID から取得
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface SyncSettings {
  fileId: string | null
  lastSyncAt: number | null
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  syncError: string | null
  isSignedIn: boolean
  pendingSync: boolean // 自動同期待機中
}

interface AppState {
  books: BookEntity[]
  memos: MemoEntity[]
  memoBooks: MemoBookCrossRef[]
  deletedItems: SyncDeletedItem[]
  syncSettings: SyncSettings

  // ---- 本の操作 ----
  addBook: (data: Omit<BookEntity, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateBook: (id: string, data: Partial<Omit<BookEntity, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteBook: (id: string) => void

  // ---- メモの操作 ----
  addMemo: (body: string, bookIds: string[]) => string
  updateMemo: (memoId: string, body: string, bookIds: string[]) => void
  deleteMemo: (memoId: string) => void

  // ---- クエリ ----
  getBookCards: (query?: string, status?: BookStatus | null) => BookCard[]
  getMemoWithBooks: (memoId: string) => MemoWithBooks | null
  getMemosForBook: (bookId: string) => MemoWithBooks[]
  getAllMemosWithBooks: () => MemoWithBooks[]
  searchMemos: (query: string, bookId?: string) => MemoWithBooks[]
  getMonthlyStats: () => MonthlyBookCount[]

  // ---- バックアップ ----
  exportBackup: () => BackupJson
  importBackup: (backup: BackupJson) => void
  loadFromLocalStorage: () => void

  // ---- Google Drive 同期 ----
  setSyncSettings: (settings: Partial<SyncSettings>) => void
  syncWithDrive: (silent?: boolean) => Promise<void>
  signInDrive: () => Promise<void>
  signOutDrive: () => void
}

const STORAGE_KEY = 'yondalog_data'
const SYNC_SETTINGS_KEY = 'yondalog_sync_settings'

// 自動同期: 最後の編集から AUTO_SYNC_DELAY ミリ秒後に Drive へ同期
const AUTO_SYNC_DELAY = 30_000 // 30秒
let autoSyncTimer: ReturnType<typeof setTimeout> | null = null

function scheduleAutoSync(isSignedIn: boolean) {
  if (!isSignedIn || !GOOGLE_CLIENT_ID) return
  // pendingSync フラグを立てる
  useStore.setState(state => ({
    syncSettings: { ...state.syncSettings, pendingSync: true },
  }))
  if (autoSyncTimer) clearTimeout(autoSyncTimer)
  autoSyncTimer = setTimeout(async () => {
    autoSyncTimer = null
    try {
      // silent=true: トークン期限切れの場合はポップアップを出さずスキップ
      await useStore.getState().syncWithDrive(true)
    } catch {
      // エラーは syncSettings.syncError に記録済み
    }
  }, AUTO_SYNC_DELAY)
}

function now(): number {
  return Date.now()
}

function saveToLocalStorage(state: Pick<AppState, 'books' | 'memos' | 'memoBooks' | 'deletedItems'>) {
  const backup: BackupJson = {
    version: 2,
    exportedAt: now(),
    books: state.books,
    memos: state.memos,
    memoBooks: state.memoBooks,
    deletedItems: state.deletedItems,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))
}

function loadFromLocalStorageRaw(): BackupJson | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as BackupJson
  } catch {
    return null
  }
}

function saveSyncSettings(settings: SyncSettings) {
  const toSave = {
    fileId: settings.fileId,
    lastSyncAt: settings.lastSyncAt,
  }
  localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(toSave))
}

function loadSyncSettings(): Partial<SyncSettings> {
  const raw = localStorage.getItem(SYNC_SETTINGS_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Partial<SyncSettings>
  } catch {
    return {}
  }
}

export const useStore = create<AppState>((set, get) => ({
  books: [],
  memos: [],
  memoBooks: [],
  deletedItems: [],
  syncSettings: {
    fileId: null,
    lastSyncAt: null,
    syncStatus: 'idle',
    syncError: null,
    isSignedIn: false,
    pendingSync: false,
    ...loadSyncSettings(),
  },

  // ---- 本の操作 ----
  addBook: (data) => {
    const id = uuidv4()
    const ts = now()
    const book: BookEntity = { ...data, id, createdAt: ts, updatedAt: ts }
    set(state => {
      const next = { ...state, books: [...state.books, book] }
      saveToLocalStorage(next)
      return next
    })
    scheduleAutoSync(get().syncSettings.isSignedIn)
    return id
  },

  updateBook: (id, data) => {
    set(state => {
      const next = {
        ...state,
        books: state.books.map(b =>
          b.id === id ? { ...b, ...data, updatedAt: now() } : b
        ),
      }
      saveToLocalStorage(next)
      return next
    })
    scheduleAutoSync(get().syncSettings.isSignedIn)
  },

  deleteBook: (id) => {
    const ts = now()
    set(state => {
      // 本に紐づくメモのうち、この本しか持たないメモも削除
      const memoIdsForBook = state.memoBooks
        .filter(mb => mb.bookId === id)
        .map(mb => mb.memoId)

      const orphanMemoIds = memoIdsForBook.filter(memoId => {
        const bookCount = state.memoBooks.filter(mb => mb.memoId === memoId).length
        return bookCount === 1
      })

      const newDeletedItems: SyncDeletedItem[] = [
        ...state.deletedItems,
        { type: 'book', primaryId: id, secondaryId: '', deletedAt: ts },
        ...orphanMemoIds.map(memoId => ({
          type: 'memo', primaryId: memoId, secondaryId: '', deletedAt: ts,
        })),
        ...state.memoBooks
          .filter(mb => mb.bookId === id)
          .map(mb => ({
            type: 'memoBook', primaryId: mb.memoId, secondaryId: mb.bookId, deletedAt: ts,
          })),
      ]

      const next = {
        ...state,
        books: state.books.filter(b => b.id !== id),
        memos: state.memos.filter(m => !orphanMemoIds.includes(m.id)),
        memoBooks: state.memoBooks.filter(mb => mb.bookId !== id),
        deletedItems: newDeletedItems,
      }
      saveToLocalStorage(next)
      return next
    })
    scheduleAutoSync(get().syncSettings.isSignedIn)
  },

  // ---- メモの操作 ----
  addMemo: (body, bookIds) => {
    const id = uuidv4()
    const ts = now()
    const memo: MemoEntity = { id, body, createdAt: ts, updatedAt: ts }
    const newMemoBooks: MemoBookCrossRef[] = bookIds.map(bookId => ({
      memoId: id,
      bookId,
      createdAt: ts,
    }))
    set(state => {
      const next = {
        ...state,
        memos: [...state.memos, memo],
        memoBooks: [...state.memoBooks, ...newMemoBooks],
      }
      saveToLocalStorage(next)
      return next
    })
    scheduleAutoSync(get().syncSettings.isSignedIn)
    return id
  },

  updateMemo: (memoId, body, bookIds) => {
    const ts = now()
    set(state => {
      const oldBookIds = state.memoBooks
        .filter(mb => mb.memoId === memoId)
        .map(mb => mb.bookId)

      const removedBookIds = oldBookIds.filter(bid => !bookIds.includes(bid))
      const addedBookIds = bookIds.filter(bid => !oldBookIds.includes(bid))

      const removeDeleted: SyncDeletedItem[] = removedBookIds.map(bookId => ({
        type: 'memoBook', primaryId: memoId, secondaryId: bookId, deletedAt: ts,
      }))

      const newMemoBooks: MemoBookCrossRef[] = addedBookIds.map(bookId => ({
        memoId,
        bookId,
        createdAt: ts,
      }))

      const next = {
        ...state,
        memos: state.memos.map(m =>
          m.id === memoId ? { ...m, body, updatedAt: ts } : m
        ),
        memoBooks: [
          ...state.memoBooks.filter(mb => !(mb.memoId === memoId && removedBookIds.includes(mb.bookId))),
          ...newMemoBooks,
        ],
        deletedItems: [...state.deletedItems, ...removeDeleted],
      }
      saveToLocalStorage(next)
      return next
    })
    scheduleAutoSync(get().syncSettings.isSignedIn)
  },

  deleteMemo: (memoId) => {
    const ts = now()
    set(state => {
      const memoBooks = state.memoBooks.filter(mb => mb.memoId === memoId)
      const newDeletedItems: SyncDeletedItem[] = [
        ...state.deletedItems,
        { type: 'memo', primaryId: memoId, secondaryId: '', deletedAt: ts },
        ...memoBooks.map(mb => ({
          type: 'memoBook', primaryId: mb.memoId, secondaryId: mb.bookId, deletedAt: ts,
        })),
      ]
      const next = {
        ...state,
        memos: state.memos.filter(m => m.id !== memoId),
        memoBooks: state.memoBooks.filter(mb => mb.memoId !== memoId),
        deletedItems: newDeletedItems,
      }
      saveToLocalStorage(next)
      return next
    })
    scheduleAutoSync(get().syncSettings.isSignedIn)
  },

  // ---- クエリ ----
  getBookCards: (query = '', status = null) => {
    const { books, memos, memoBooks } = get()
    let filtered = books
    if (query) {
      const q = query.toLowerCase()
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.author?.toLowerCase().includes(q) ?? false)
      )
    }
    if (status) {
      filtered = filtered.filter(b => b.status === status)
    }
    return filtered.map(book => {
      const memoIds = memoBooks.filter(mb => mb.bookId === book.id).map(mb => mb.memoId)
      const bookMemos = memos.filter(m => memoIds.includes(m.id))
        .sort((a, b) => b.updatedAt - a.updatedAt)
      return {
        book,
        memoCount: bookMemos.length,
        latestMemoSnippet: bookMemos[0]?.body.slice(0, 60) ?? null,
      }
    }).sort((a, b) => b.book.updatedAt - a.book.updatedAt)
  },

  getMemoWithBooks: (memoId) => {
    const { memos, books, memoBooks } = get()
    const memo = memos.find(m => m.id === memoId)
    if (!memo) return null
    const bookIds = memoBooks.filter(mb => mb.memoId === memoId).map(mb => mb.bookId)
    return { memo, books: books.filter(b => bookIds.includes(b.id)) }
  },

  getMemosForBook: (bookId) => {
    const { memos, books, memoBooks } = get()
    const memoIds = memoBooks.filter(mb => mb.bookId === bookId).map(mb => mb.memoId)
    return memos
      .filter(m => memoIds.includes(m.id))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(memo => {
        const bIds = memoBooks.filter(mb => mb.memoId === memo.id).map(mb => mb.bookId)
        return { memo, books: books.filter(b => bIds.includes(b.id)) }
      })
  },

  getAllMemosWithBooks: () => {
    const { memos, books, memoBooks } = get()
    return memos
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(memo => {
        const bIds = memoBooks.filter(mb => mb.memoId === memo.id).map(mb => mb.bookId)
        return { memo, books: books.filter(b => bIds.includes(b.id)) }
      })
  },

  searchMemos: (query, bookId) => {
    const { memos, books, memoBooks } = get()
    const q = query.toLowerCase()
    let filtered = memos.filter(m => m.body.toLowerCase().includes(q))
    if (bookId) {
      const memoIds = new Set(memoBooks.filter(mb => mb.bookId === bookId).map(mb => mb.memoId))
      filtered = filtered.filter(m => memoIds.has(m.id))
    }
    return filtered
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(memo => {
        const bIds = memoBooks.filter(mb => mb.memoId === memo.id).map(mb => mb.bookId)
        return { memo, books: books.filter(b => bIds.includes(b.id)) }
      })
  },

  getMonthlyStats: () => {
    const { books } = get()
    const finished = books.filter(b => b.status === 'FINISHED' && b.finishedAt)
    const countMap = new Map<string, number>()
    for (const book of finished) {
      const date = new Date(book.finishedAt!)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      countMap.set(month, (countMap.get(month) ?? 0) + 1)
    }
    return [...countMap.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
  },

  // ---- バックアップ ----
  exportBackup: () => {
    const { books, memos, memoBooks, deletedItems } = get()
    return {
      version: 2,
      exportedAt: now(),
      books,
      memos,
      memoBooks,
      deletedItems,
    }
  },

  importBackup: (backup) => {
    set(state => {
      const next = {
        ...state,
        books: backup.books ?? [],
        memos: backup.memos ?? [],
        memoBooks: backup.memoBooks ?? [],
        deletedItems: backup.deletedItems ?? [],
      }
      saveToLocalStorage(next)
      return next
    })
  },

  loadFromLocalStorage: () => {
    const backup = loadFromLocalStorageRaw()
    if (backup) {
      set(state => ({
        ...state,
        books: backup.books ?? [],
        memos: backup.memos ?? [],
        memoBooks: backup.memoBooks ?? [],
        deletedItems: backup.deletedItems ?? [],
      }))
    }
  },

  // ---- Google Drive 同期 ----
  setSyncSettings: (settings) => {
    set(state => {
      const next = { ...state, syncSettings: { ...state.syncSettings, ...settings } }
      saveSyncSettings(next.syncSettings)
      return next
    })
  },

  signInDrive: async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('VITE_GOOGLE_CLIENT_ID が設定されていません')
    }
    const client = getDriveClient(GOOGLE_CLIENT_ID)
    await client.signIn()
    set(state => ({
      ...state,
      syncSettings: { ...state.syncSettings, isSignedIn: true },
    }))
  },

  signOutDrive: () => {
    if (GOOGLE_CLIENT_ID) {
      const client = getDriveClient(GOOGLE_CLIENT_ID)
      client.signOut()
    }
    set(state => ({
      ...state,
      syncSettings: {
        ...state.syncSettings,
        isSignedIn: false,
        fileId: null,
        lastSyncAt: null,
      },
    }))
    saveSyncSettings(get().syncSettings)
  },

  syncWithDrive: async (silent = false) => {
    const { syncSettings, exportBackup } = get()
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('VITE_GOOGLE_CLIENT_ID が設定されていません')
    }

    const client = getDriveClient(GOOGLE_CLIENT_ID)

    // サイレントモード: トークンが期限切れなら認証ポップアップを出さずスキップ
    if (silent && !client.isSignedIn()) {
      set(state => ({
        ...state,
        syncSettings: { ...state.syncSettings, pendingSync: false },
      }))
      return
    }

    set(state => ({
      ...state,
      syncSettings: { ...state.syncSettings, syncStatus: 'syncing', syncError: null },
    }))

    try {
      if (!client.isSignedIn()) {
        await client.signIn()
      }

      const local = exportBackup()
      const remote = await client.loadFromDrive()

      let finalBackup: BackupJson
      let finalFileId = syncSettings.fileId

      if (!remote) {
        // Drive上にファイルなし → ローカルをアップロード
        finalBackup = local
        finalFileId = await client.saveToDrive(local, null)
      } else {
        // マージして保存
        const { merged, needsRemoteUpdate } = mergeBackups(local, remote.backup)
        finalBackup = merged
        finalFileId = remote.fileId

        if (needsRemoteUpdate) {
          await client.saveToDrive(merged, remote.fileId)
        }
      }

      // ローカル状態を更新
      get().importBackup(finalBackup)

      const ts = now()
      set(state => ({
        ...state,
        syncSettings: {
          ...state.syncSettings,
          syncStatus: 'success',
          fileId: finalFileId,
          lastSyncAt: ts,
          isSignedIn: true,
          pendingSync: false,
        },
      }))
      saveSyncSettings(get().syncSettings)
    } catch (err) {
      const message = err instanceof Error ? err.message : '同期に失敗しました'
      set(state => ({
        ...state,
        syncSettings: { ...state.syncSettings, syncStatus: 'error', syncError: message },
      }))
      throw err
    }
  },
}))
