import { useEffect, useState } from 'react'
import { feedsApi, categoriesApi, Feed, Category } from '../api/client'

export default function FeedManager() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [catId, setCatId] = useState<number | undefined>()
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    feedsApi.list().then(setFeeds).catch(() => {})
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  const handleAdd = async () => {
    if (!url) return
    try {
      await feedsApi.create({ url, category_id: catId })
      setUrl('')
      setCatId(undefined)
      setShowAdd(false)
      feedsApi.list().then(setFeeds)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to add feed')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this feed?')) return
    await feedsApi.delete(id)
    feedsApi.list().then(setFeeds)
  }

  const handleToggle = async (feed: Feed) => {
    await feedsApi.update(feed.id, { enabled: !feed.enabled })
    feedsApi.list().then(setFeeds)
  }

  const handleAddCategory = async () => {
    if (!newCatName) return
    await categoriesApi.create(newCatName)
    setNewCatName('')
    categoriesApi.list().then(setCategories)
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category? Feeds will become uncategorized.')) return
    await categoriesApi.delete(id)
    categoriesApi.list().then(setCategories)
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Feeds</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showAdd ? 'Cancel' : '+ Add Feed'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              placeholder="RSS Feed URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <select
              value={catId ?? ''}
              onChange={(e) => setCatId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Add</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Feeds ({feeds.length})</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            {feeds.map((feed) => (
              <div key={feed.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                {feed.icon_url ? (
                  <img src={feed.icon_url} alt="" className="w-8 h-8 rounded" />
                ) : (
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm text-blue-600 font-bold">
                    {feed.title[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{feed.title}</p>
                  <p className="text-xs text-gray-500 truncate">{feed.url}</p>
                  {feed.error_count > 0 && (
                    <p className="text-xs text-red-500">Errors: {feed.error_count}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(feed)} className={`px-2 py-1 rounded text-xs font-medium ${feed.enabled ? 'bg-green-100 dark:bg-green-900 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {feed.enabled ? 'On' : 'Off'}
                  </button>
                  <button onClick={() => feedsApi.refresh(feed.id)} className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200" title="Refresh">
                    ↻
                  </button>
                  <button onClick={() => handleDelete(feed.id)} className="px-2 py-1 rounded text-xs bg-red-100 dark:bg-red-900 text-red-600 hover:bg-red-200" title="Delete">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {feeds.length === 0 && (
              <p className="text-sm text-gray-400 p-4 text-center">No feeds yet. Add one above!</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Categories</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="New category"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs"
              />
              <button onClick={handleAddCategory} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Add</button>
            </div>
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name} ({cat.feed_count})</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs text-red-500 hover:text-red-700">✕</button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-gray-400 text-center">No categories</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
