// バックアップJSONのパース処理
// Android アプリが openOutputStream(..., "wt") で書き込む際に
// ファイルの末尾に古いデータが残ることがある（truncate漏れ）。
// この場合、有効なJSONの後に余分なテキストが続くため、
// JSON.parse が "Unexpected non-whitespace character after JSON at position N" エラーを投げる。
// このユーティリティはそのケースを自動検出・修復してパースする。

import type { BackupJson } from '../types/models'

export function parseBackupJson(text: string): BackupJson {
  try {
    return JSON.parse(text) as BackupJson
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err

    // V8 / JavaScriptCore のエラーメッセージから余分データの開始位置を取得
    // 例: "Unexpected non-whitespace character after JSON at position 292977"
    // 例: "JSON Parse error: Unexpected identifier after root element"
    const posMatch = err.message.match(/position (\d+)/i)
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10)
      try {
        const recovered = JSON.parse(text.slice(0, pos)) as BackupJson
        console.warn(
          `[parseBackupJson] ファイルに余分なデータが含まれていました。` +
          `先頭 ${pos} バイトの有効なJSONを使用します。`
        )
        return recovered
      } catch {
        // 修復も失敗した場合はオリジナルのエラーを投げる
      }
    }

    // JavaScriptCore 系（Safari）対応: ブラケット深度で有効部分を特定
    const recovered = tryRecoverByBrackets(text)
    if (recovered !== null) {
      console.warn('[parseBackupJson] ブラケット解析で余分なデータを除去しました')
      return recovered as BackupJson
    }

    throw err
  }
}

/**
 * ブラケットの深度カウントで最初の完全なJSONオブジェクトを切り出す。
 * Safari など position が取れないブラウザ向けのフォールバック。
 */
function tryRecoverByBrackets(text: string): unknown {
  let depth = 0
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{' || ch === '[') {
      depth++
    } else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(0, i + 1))
        } catch {
          return null
        }
      }
    }
  }

  return null
}
