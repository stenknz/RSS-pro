import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { feedsApi, categoriesApi } from '../../api/client'
import { useFeedStore } from '../../stores/feedStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useUIStore } from '../../stores/uiStore'

export default function Sidebar() {
  const location = useLocation()
  const { feeds, setFeeds } = useFeedStore()
  const { categories, setCategories } = useCategoryStore()
  const { theme, setTheme } = useUIStore()

  useEffect(() => {
    feedsApi.list().then(setFeeds).catch(() => {})
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/articles', label: 'All Articles', icon: '📰' },
    { path: '/saved', label: 'Saved', icon: '⭐' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/feeds', label: 'Manage Feeds', icon: '⚙️' },
    { path: '/settings', label: 'Settings', icon: '🔧' },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-bold text-blue-600">RSS Reader</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              location.pathname === link.path
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}

        <div className="border-t border-gray-200 dark:border-gray-800 my-2 pt-2">
          <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</p>
          <Link
            to="/articles"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <span>📋</span>
            <span>All Feeds</span>
            <span className="ml-auto text-xs text-gray-400">
              {feeds.filter(f => f.enabled).length}
            </span>
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <span>📁</span>
              <span>{cat.name}</span>
              <span className="ml-auto text-xs text-gray-400">{cat.feed_count}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md"
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>
    </div>
  )
}
