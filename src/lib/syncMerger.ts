// SyncMerger.kt の TypeScript 移植版
// Last-Write-Wins (LWW) アルゴリズムによる同期マージ

import type {
  BackupJson,
  BookEntity,
  MemoEntity,
  MemoBookCrossRef,
  SyncDeletedItem,
} from '../types/models'

export interface MergeResult {
  merged: BackupJson
  needsLocalUpdate: boolean
  needsRemoteUpdate: boolean
}

export function mergeBackups(local: BackupJson, remote: BackupJson): MergeResult {
  const localDeleted = buildDeletedMap(local.deletedItems)
  const remoteDeleted = buildDeletedMap(remote.deletedItems)

  const localBooks = new Map(local.books.map(b => [b.id, b]))
  const remoteBooks = new Map(remote.books.map(b => [b.id, b]))
  const localMemos = new Map(local.memos.map(m => [m.id, m]))
  const remoteMemos = new Map(remote.memos.map(m => [m.id, m]))
  const localMemoBooks = new Map(local.memoBooks.map(mb => [memoBookKey(mb.memoId, mb.bookId), mb]))
  const remoteMemoBooks = new Map(remote.memoBooks.map(mb => [memoBookKey(mb.memoId, mb.bookId), mb]))

  const mergedDeleted = new Map<string, SyncDeletedItem>()

  const mergedBooks = mergeEntities<BookEntity>(
    collectIds([...localBooks.keys()], [...remoteBooks.keys()], localDeleted, remoteDeleted, 'book'),
    localBooks,
    remoteBooks,
    localDeleted,
    remoteDeleted,
    'book',
    (b) => b.updatedAt,
    mergedDeleted
  )

  const mergedMemos = mergeEntities<MemoEntity>(
    collectIds([...localMemos.keys()], [...remoteMemos.keys()], localDeleted, remoteDeleted, 'memo'),
    localMemos,
    remoteMemos,
    localDeleted,
    remoteDeleted,
    'memo',
    (m) => m.updatedAt,
    mergedDeleted
  )

  const mergedMemoBookIds = collectMemoBookIds(
    [...localMemoBooks.keys()],
    [...remoteMemoBooks.keys()],
    localDeleted,
    remoteDeleted
  )

  const mergedMemoBooks = mergeMemoBooks(
    mergedMemoBookIds,
    localMemoBooks,
    remoteMemoBooks,
    localDeleted,
    remoteDeleted,
    mergedDeleted
  ).filter(mb => {
    return mergedBooks.some(b => b.id === mb.bookId) &&
           mergedMemos.some(m => m.id === mb.memoId)
  })

  const mergedBackup: BackupJson = {
    version: 2,
    exportedAt: Math.max(local.exportedAt, remote.exportedAt),
    books: [...mergedBooks].sort((a, b) => a.id.localeCompare(b.id)),
    memos: [...mergedMemos].sort((a, b) => a.id.localeCompare(b.id)),
    memoBooks: [...mergedMemoBooks].sort((a, b) =>
      memoBookKey(a.memoId, a.bookId).localeCompare(memoBookKey(b.memoId, b.bookId))
    ),
    deletedItems: [...mergedDeleted.values()].sort((a, b) => {
      const t = a.type.localeCompare(b.type)
      if (t !== 0) return t
      const p = a.primaryId.localeCompare(b.primaryId)
      if (p !== 0) return p
      return a.secondaryId.localeCompare(b.secondaryId)
    }),
  }

  return {
    merged: mergedBackup,
    needsLocalUpdate: !isSameBackup(mergedBackup, local),
    needsRemoteUpdate: !isSameBackup(mergedBackup, remote),
  }
}

function buildDeletedMap(items: SyncDeletedItem[]): Map<string, SyncDeletedItem> {
  const map = new Map<string, SyncDeletedItem>()
  for (const item of items) {
    const key = deletedKey(item.type, item.primaryId, item.secondaryId)
    const existing = map.get(key)
    if (!existing || item.deletedAt > existing.deletedAt) {
      map.set(key, item)
    }
  }
  return map
}

function collectIds(
  localIds: string[],
  remoteIds: string[],
  localDeleted: Map<string, SyncDeletedItem>,
  remoteDeleted: Map<string, SyncDeletedItem>,
  type: string
): Set<string> {
  const ids = new Set<string>()
  localIds.forEach(id => ids.add(id))
  remoteIds.forEach(id => ids.add(id))
  localDeleted.forEach(item => { if (item.type === type) ids.add(item.primaryId) })
  remoteDeleted.forEach(item => { if (item.type === type) ids.add(item.primaryId) })
  return ids
}

function collectMemoBookIds(
  localIds: string[],
  remoteIds: string[],
  localDeleted: Map<string, SyncDeletedItem>,
  remoteDeleted: Map<string, SyncDeletedItem>
): Set<string> {
  const ids = new Set<string>()
  localIds.forEach(id => ids.add(id))
  remoteIds.forEach(id => ids.add(id))
  localDeleted.forEach(item => {
    if (item.type === 'memoBook') ids.add(memoBookKey(item.primaryId, item.secondaryId))
  })
  remoteDeleted.forEach(item => {
    if (item.type === 'memoBook') ids.add(memoBookKey(item.primaryId, item.secondaryId))
  })
  return ids
}

function mergeEntities<T>(
  ids: Set<string>,
  localItems: Map<string, T>,
  remoteItems: Map<string, T>,
  localDeleted: Map<string, SyncDeletedItem>,
  remoteDeleted: Map<string, SyncDeletedItem>,
  type: string,
  updatedAt: (item: T) => number,
  mergedDeleted: Map<string, SyncDeletedItem>
): T[] {
  const merged: T[] = []
  for (const id of ids) {
    const localItem = localItems.get(id)
    const remoteItem = remoteItems.get(id)
    const localDel = localDeleted.get(deletedKey(type, id, ''))
    const remoteDel = remoteDeleted.get(deletedKey(type, id, ''))

    const latestUpdate = Math.max(
      localItem ? updatedAt(localItem) : Number.MIN_SAFE_INTEGER,
      remoteItem ? updatedAt(remoteItem) : Number.MIN_SAFE_INTEGER
    )
    const latestDelete = Math.max(
      localDel?.deletedAt ?? Number.MIN_SAFE_INTEGER,
      remoteDel?.deletedAt ?? Number.MIN_SAFE_INTEGER
    )

    if (latestDelete > latestUpdate) {
      const winner = (localDel?.deletedAt ?? Number.MIN_SAFE_INTEGER) >= (remoteDel?.deletedAt ?? Number.MIN_SAFE_INTEGER)
        ? localDel
        : remoteDel
      if (winner) {
        mergedDeleted.set(deletedKey(type, id, ''), winner)
      }
      continue
    }

    const chosen = !localItem
      ? remoteItem
      : !remoteItem
        ? localItem
        : updatedAt(localItem) >= updatedAt(remoteItem)
          ? localItem
          : remoteItem

    if (chosen) merged.push(chosen)
  }
  return merged
}

function mergeMemoBooks(
  ids: Set<string>,
  localItems: Map<string, MemoBookCrossRef>,
  remoteItems: Map<string, MemoBookCrossRef>,
  localDeleted: Map<string, SyncDeletedItem>,
  remoteDeleted: Map<string, SyncDeletedItem>,
  mergedDeleted: Map<string, SyncDeletedItem>
): MemoBookCrossRef[] {
  const merged: MemoBookCrossRef[] = []
  for (const key of ids) {
    const parts = key.split('|')
    if (parts.length !== 2) continue
    const [memoId, bookId] = parts
    const localItem = localItems.get(key)
    const remoteItem = remoteItems.get(key)
    const localDel = localDeleted.get(deletedKey('memoBook', memoId, bookId))
    const remoteDel = remoteDeleted.get(deletedKey('memoBook', memoId, bookId))

    const latestUpdate = Math.max(
      localItem?.createdAt ?? Number.MIN_SAFE_INTEGER,
      remoteItem?.createdAt ?? Number.MIN_SAFE_INTEGER
    )
    const latestDelete = Math.max(
      localDel?.deletedAt ?? Number.MIN_SAFE_INTEGER,
      remoteDel?.deletedAt ?? Number.MIN_SAFE_INTEGER
    )

    if (latestDelete > latestUpdate) {
      const winner = (localDel?.deletedAt ?? Number.MIN_SAFE_INTEGER) >= (remoteDel?.deletedAt ?? Number.MIN_SAFE_INTEGER)
        ? localDel
        : remoteDel
      if (winner) {
        mergedDeleted.set(deletedKey('memoBook', memoId, bookId), winner)
      }
      continue
    }

    const chosen = !localItem
      ? remoteItem
      : !remoteItem
        ? localItem
        : localItem.createdAt >= remoteItem.createdAt
          ? localItem
          : remoteItem

    if (chosen) merged.push(chosen)
  }
  return merged
}

function isSameBackup(a: BackupJson, b: BackupJson): boolean {
  return sameById(a.books, b.books) &&
         sameById(a.memos, b.memos) &&
         sameMemoBooks(a.memoBooks, b.memoBooks) &&
         sameDeletedItems(a.deletedItems, b.deletedItems)
}

function sameById<T extends { id: string }>(a: T[], b: T[]): boolean {
  const mapA = new Map(a.map(x => [x.id, x]))
  const mapB = new Map(b.map(x => [x.id, x]))
  if (mapA.size !== mapB.size) return false
  for (const [k, v] of mapA) {
    if (JSON.stringify(v) !== JSON.stringify(mapB.get(k))) return false
  }
  return true
}

function sameMemoBooks(a: MemoBookCrossRef[], b: MemoBookCrossRef[]): boolean {
  const mapA = new Map(a.map(x => [memoBookKey(x.memoId, x.bookId), x]))
  const mapB = new Map(b.map(x => [memoBookKey(x.memoId, x.bookId), x]))
  if (mapA.size !== mapB.size) return false
  for (const [k, v] of mapA) {
    if (JSON.stringify(v) !== JSON.stringify(mapB.get(k))) return false
  }
  return true
}

function sameDeletedItems(a: SyncDeletedItem[], b: SyncDeletedItem[]): boolean {
  const mapA = new Map(a.map(x => [deletedKey(x.type, x.primaryId, x.secondaryId), x]))
  const mapB = new Map(b.map(x => [deletedKey(x.type, x.primaryId, x.secondaryId), x]))
  if (mapA.size !== mapB.size) return false
  for (const [k, v] of mapA) {
    if (JSON.stringify(v) !== JSON.stringify(mapB.get(k))) return false
  }
  return true
}

export function deletedKey(type: string, primaryId: string, secondaryId: string): string {
  return `${type}|${primaryId}|${secondaryId}`
}

export function memoBookKey(memoId: string, bookId: string): string {
  return `${memoId}|${bookId}`
}
