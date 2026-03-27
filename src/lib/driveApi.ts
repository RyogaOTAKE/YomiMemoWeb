// Google Drive API 連携モジュール
// Google Identity Services (GIS) を使用した OAuth 2.0 認証と
// Drive REST API を使ったファイル読み書き

import type { BackupJson } from '../types/models'
import { parseBackupJson } from './parseBackup'

// google.accounts.oauth2 の型定義
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient
          revoke: (token: string, callback: () => void) => void
        }
      }
    }
  }
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: { type: string }) => void
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void
}

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}

interface DriveFile {
  id: string
  name: string
  modifiedTime: string
  size: string
}

interface DriveFileListResponse {
  files: DriveFile[]
}

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'
const YONDALOG_FILENAME = 'yondalog_backup.json'
const MIME_JSON = 'application/json'

export class DriveApiClient {
  private clientId: string
  private accessToken: string | null = null
  private tokenClient: TokenClient | null = null
  private tokenExpiry: number = 0

  constructor(clientId: string) {
    this.clientId = clientId
  }

  // OAuth 2.0 認証フローを開始
  async signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services が読み込まれていません'))
        return
      }

      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: DRIVE_SCOPE,
        callback: (response: TokenResponse) => {
          if (response.error) {
            reject(new Error(`認証エラー: ${response.error}`))
            return
          }
          this.accessToken = response.access_token
          this.tokenExpiry = Date.now() + (response.expires_in - 60) * 1000
          resolve()
        },
        error_callback: (error) => {
          reject(new Error(`認証エラー: ${error.type}`))
        },
      })

      this.tokenClient.requestAccessToken({ prompt: 'consent' })
    })
  }

  // サイレント再認証（既にログイン済みの場合）
  async refreshToken(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('先にサインインしてください'))
        return
      }

      this.tokenClient.requestAccessToken({ prompt: '' })
      // コールバックは initTokenClient で設定済み
      resolve()
    })
  }

  // サインアウト
  signOut(): void {
    if (this.accessToken) {
      window.google?.accounts?.oauth2?.revoke(this.accessToken, () => {})
    }
    this.accessToken = null
    this.tokenExpiry = 0
  }

  isSignedIn(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiry
  }

  private getHeaders(): Record<string, string> {
    if (!this.accessToken) throw new Error('認証が必要です')
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  // Drive上のバックアップファイルを検索
  async findBackupFile(): Promise<DriveFile | null> {
    const params = new URLSearchParams({
      q: `name='${YONDALOG_FILENAME}' and mimeType='${MIME_JSON}' and trashed=false`,
      fields: 'files(id,name,modifiedTime,size)',
      orderBy: 'modifiedTime desc',
      pageSize: '1',
    })

    const response = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`ファイル検索エラー: ${response.statusText}`)
    }

    const data: DriveFileListResponse = await response.json()
    return data.files.length > 0 ? data.files[0] : null
  }

  // バックアップJSONを読み込む
  async readBackup(fileId: string): Promise<BackupJson> {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`ファイル読み込みエラー: ${response.statusText}`)
    }

    const text = await response.text()
    return parseBackupJson(text)
  }

  // バックアップJSONを新規作成
  async createBackup(backup: BackupJson): Promise<string> {
    const content = JSON.stringify(backup, null, 2)
    const metadata = {
      name: YONDALOG_FILENAME,
      mimeType: MIME_JSON,
    }

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([content], { type: MIME_JSON }))

    const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    })

    if (!response.ok) {
      throw new Error(`ファイル作成エラー: ${response.statusText}`)
    }

    const data: { id: string } = await response.json()
    return data.id
  }

  // バックアップJSONを上書き更新
  async updateBackup(fileId: string, backup: BackupJson): Promise<void> {
    const content = JSON.stringify(backup, null, 2)

    const response = await fetch(
      `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': MIME_JSON,
        },
        body: content,
      }
    )

    if (!response.ok) {
      throw new Error(`ファイル更新エラー: ${response.statusText}`)
    }
  }

  // バックアップを読み込む（ファイルがなければnull）
  async loadFromDrive(): Promise<{ fileId: string; backup: BackupJson } | null> {
    const file = await this.findBackupFile()
    if (!file) return null
    const backup = await this.readBackup(file.id)
    return { fileId: file.id, backup }
  }

  // バックアップをDriveに保存（新規 or 更新）
  async saveToDrive(backup: BackupJson, fileId: string | null): Promise<string> {
    if (fileId) {
      await this.updateBackup(fileId, backup)
      return fileId
    } else {
      return await this.createBackup(backup)
    }
  }
}

// シングルトンインスタンス（clientId は SyncPage で設定）
let driveClient: DriveApiClient | null = null

export function getDriveClient(clientId?: string): DriveApiClient {
  if (!driveClient || clientId) {
    if (!clientId) throw new Error('初回はclientIdが必要です')
    driveClient = new DriveApiClient(clientId)
  }
  return driveClient
}
