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
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Manage Feeds</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {showAdd ? 'Cancel' : 'Add Feed'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-8 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex gap-3">
            <input
              type="url"
              placeholder="RSS Feed URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
            <select
              value={catId ?? ''}
              onChange={(e) => setCatId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-accent-500"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleAdd} className="px-5 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors">Add</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Feeds ({feeds.length})</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            {feeds.map((feed) => (
              <div key={feed.id} className="flex items-center gap-4 px-5 py-4">
                {feed.icon_url ? (
                  <img src={feed.icon_url} alt="" className="w-9 h-9 rounded-lg" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-accent-100 dark:bg-accent-900/50 flex items-center justify-center text-sm font-bold text-accent-600 dark:text-accent-400">
                    {feed.title[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{feed.title}</p>
                  <p className="text-xs text-gray-500 truncate">{feed.url}</p>
                  {feed.error_count > 0 && (
                    <p className="text-xs text-red-500 mt-0.5">{feed.error_count} error{(feed.error_count > 1 ? 's' : '')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(feed)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${feed.enabled ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                  >
                    {feed.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => feedsApi.refresh(feed.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Refresh"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {feeds.length === 0 && (
              <p className="text-sm text-gray-400 p-5 text-center">No feeds yet. Add one above!</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Categories</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New category"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs focus:ring-2 focus:ring-accent-500"
              />
              <button onClick={handleAddCategory} className="px-3 py-1.5 bg-accent-600 text-white rounded-lg text-xs font-medium hover:bg-accent-700 transition-colors">Add</button>
            </div>
            <div className="space-y-1">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name} <span className="text-gray-400">({cat.feed_count})</span></span>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No categories</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
