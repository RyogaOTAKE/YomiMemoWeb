import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { BookDetailPage } from './pages/BookDetailPage'
import { MemoListPage } from './pages/MemoListPage'
import { SearchPage } from './pages/SearchPage'
import { StatsPage } from './pages/StatsPage'
import { SyncPage } from './pages/SyncPage'
import { useStore } from './store/useStore'

function App() {
  const { loadFromLocalStorage } = useStore()

  // アプリ起動時にlocalStorageからデータを復元
  useEffect(() => {
    loadFromLocalStorage()
  }, [loadFromLocalStorage])

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/memos" element={<MemoListPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/sync" element={<SyncPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
