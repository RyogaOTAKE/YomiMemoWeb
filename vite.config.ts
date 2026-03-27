import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// base を GitHub Pages のリポジトリ名に合わせて変更してください
// 例: base: '/yondalog-web/'
export default defineConfig({
  plugins: [react()],
  base: '/YomiMemoWeb/',
  server: {
    headers: {
      // Google Identity Services のポップアップ通信を許可するため COOP を無効化
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
})
