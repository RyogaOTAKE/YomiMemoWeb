import { useState, useRef, type ChangeEvent } from 'react'
import { CloudOff, Cloud, RefreshCw, LogOut, Upload, Download, Clock } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { BackupJson } from '../types/models'
import { parseBackupJson } from '../lib/parseBackup'

export function SyncPage() {
  const {
    syncSettings,
    syncWithDrive,
    signInDrive,
    signOutDrive,
    exportBackup,
    importBackup,
    books,
    memos,
  } = useStore()

  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSyncing = syncSettings.syncStatus === 'syncing'

  async function handleSignIn() {
    try {
      await signInDrive()
    } catch (_err) {
      // エラーは syncSettings.syncError に保存済み
    }
  }

  async function handleSync() {
    try {
      await syncWithDrive()
    } catch (_err) {
      // エラーは syncSettings.syncError に保存済み
    }
  }

  function handleExport() {
    const backup = exportBackup()
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yondalog_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setImportSuccess(false)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const data = parseBackupJson(text)
        if (!Array.isArray(data.books) || !Array.isArray(data.memos)) {
          throw new Error('無効なバックアップファイルです')
        }
        importBackup(data)
        setImportSuccess(true)
        setTimeout(() => setImportSuccess(false), 3000)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'インポートに失敗しました')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">同期・設定</h1>
      </div>

      <div className="page-container" style={{ paddingTop: '8px' }}>

        {/* 現在のデータ概要 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>ローカルデータ</h2>
          <div className="flex gap-4">
            <span className="text-sm text-muted">📚 {books.length}冊</span>
            <span className="text-sm text-muted">📝 {memos.length}件のメモ</span>
          </div>
        </div>

        {/* Google Drive 同期 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
            Google Drive 同期
          </h2>

          {syncSettings.isSignedIn && (
            <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>
              🔄 自動同期: 編集後30秒で自動的にDriveへ保存（認証は1時間有効）
            </p>
          )}

          {syncSettings.pendingSync && (
            <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
              <Clock size={12} style={{ color: 'var(--color-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--color-primary)' }}>
                同期待機中...
              </span>
            </div>
          )}

          {syncSettings.lastSyncAt && (
            <p className="text-xs text-muted" style={{ marginBottom: '12px' }}>
              最終同期: {new Date(syncSettings.lastSyncAt).toLocaleString('ja-JP')}
            </p>
          )}

          {syncSettings.syncStatus === 'error' && syncSettings.syncError && (
            <div style={{
              backgroundColor: 'var(--color-error-container)',
              color: 'var(--color-error)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '12px',
            }}>
              {syncSettings.syncError}
            </div>
          )}

          {syncSettings.syncStatus === 'success' && (
            <div style={{
              backgroundColor: 'var(--color-success-container)',
              color: 'var(--color-success)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '12px',
            }}>
              ✓ 同期が完了しました
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!syncSettings.isSignedIn ? (
              <button className="btn btn-primary btn-sm" onClick={handleSignIn}>
                <Cloud size={14} />
                Googleでサインイン
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <div className="loading-spinner" style={{ width: '14px', height: '14px' }} />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {isSyncing ? '同期中...' : '今すぐ同期'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={signOutDrive}>
                  <LogOut size={14} />
                  サインアウト
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            {syncSettings.isSignedIn ? (
              <>
                <Cloud size={14} style={{ color: 'var(--color-success)' }} />
                <span className="text-xs text-muted">Googleアカウントに接続済み</span>
              </>
            ) : (
              <>
                <CloudOff size={14} style={{ color: 'var(--color-on-surface-variant)' }} />
                <span className="text-xs text-muted">未接続</span>
              </>
            )}
          </div>
        </div>

        {/* ローカルバックアップ */}
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
            ローカルバックアップ
          </h2>
          <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>
            AndroidアプリのJSONバックアップファイルをインポート/エクスポートできます。
          </p>

          {importError && (
            <div style={{
              backgroundColor: 'var(--color-error-container)',
              color: 'var(--color-error)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '12px',
            }}>
              {importError}
            </div>
          )}

          {importSuccess && (
            <div style={{
              backgroundColor: 'var(--color-success-container)',
              color: 'var(--color-success)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '12px',
            }}>
              ✓ インポートが完了しました
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} />
              JSONをエクスポート
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              JSONをインポート
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />

          <p className="text-xs text-muted mt-2">
            ⚠️ インポートするとローカルデータが上書きされます
          </p>
        </div>
      </div>
    </div>
  )
}
