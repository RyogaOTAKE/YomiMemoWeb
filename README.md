# YondaLog Web

YondaLog Android アプリの読書記録を、ブラウザから管理できるWebアプリです。

## 機能

- 📚 **本の管理** - 追加・編集・削除、ステータス管理（未読/読書中/読了/購入検討）
- 📝 **メモ管理** - 本に紐づくメモの追加・編集・削除（1メモ = 複数の本に紐付け可）
- 🔍 **全文検索** - メモを横断的に検索
- 📊 **統計** - 月別・年別の読了数グラフ
- ☁️ **Google Drive 同期** - AndroidアプリとJSONファイルを共有して双方向同期
- 💾 **ローカルバックアップ** - JSONファイルのエクスポート・インポート

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 開発サーバー起動

```bash
npm run dev
```

### 3. ビルド

```bash
npm run build
```

## Google Drive 同期の設定

### Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」から **Google Drive API** を有効化
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
4. アプリケーションの種類：**ウェブアプリケーション**
5. 承認済みのJavaScriptオリジン：
   - 開発時: `http://localhost:5173`
   - 本番: `https://<あなたのGitHubユーザー名>.github.io`
6. クライアントIDをコピー

### アプリでの設定

1. WebApp の「同期・設定」ページを開く
2. Google OAuth 2.0 クライアントIDを貼り付け
3. 「Googleでサインイン」をクリック

### 同期ファイルについて

- Drive のマイドライブに `yondalog_backup.json` として保存されます
- AndroidアプリのドライブファイルとWebAppが同じファイルを共有します
- 同期は Last-Write-Wins (LWW) アルゴリズムで競合を解決します

## GitHub Pages へのデプロイ

1. GitHubに新しいリポジトリを作成し、このコードをプッシュ
2. リポジトリの Settings → Pages → Source: **GitHub Actions** を選択
3. `main` ブランチにプッシュすると自動デプロイされます
4. デプロイ先: `https://<ユーザー名>.github.io/<リポジトリ名>/`

### `vite.config.ts` の base 設定

GitHub Pages でサブパス配下にデプロイする場合、`vite.config.ts` の `base` をリポジトリ名に合わせてください：

```ts
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/',
})
```

## 技術スタック

- **React 18** + **TypeScript**
- **Vite 5** - ビルドツール
- **Zustand** - 状態管理
- **React Router v6** - ルーティング
- **Google Identity Services** - OAuth 2.0
- **Google Drive REST API** - ファイル読み書き
- **localStorage** - ローカルデータ永続化
