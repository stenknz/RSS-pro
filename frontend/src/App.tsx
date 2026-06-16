import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import AuthGuard from './components/Auth/AuthGuard'
import LoginPage from './components/Auth/LoginPage'
import RegisterPage from './components/Auth/RegisterPage'
import Dashboard from './pages/Dashboard'
import AllArticles from './pages/AllArticles'
import FeedManager from './pages/FeedManager'
import CategoryView from './pages/CategoryView'
import SavedView from './pages/SavedView'
import StarredView from './pages/StarredView'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import { useUIStore } from './stores/uiStore'

export default function App() {
  const { theme } = useUIStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="articles" element={<AllArticles />} />
          <Route path="articles/:id" element={<AllArticles />} />
          <Route path="feeds" element={<FeedManager />} />
          <Route path="category/:id" element={<CategoryView />} />
          <Route path="saved" element={<SavedView />} />
          <Route path="starred" element={<StarredView />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
