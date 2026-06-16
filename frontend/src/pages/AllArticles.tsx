import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { articlesApi, feedsApi, Article } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'

export default function AllArticles() {
  const [searchParams] = useSearchParams()
  const feedId = searchParams.get('feed_id')

  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'saved'>(feedId ? 'all' : 'unread')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [feedTitle, setFeedTitle] = useState('')

  useEffect(() => {
    setPage(1)
    setFeedTitle('')
    if (feedId) {
      feedsApi.get(Number(feedId)).then(f => setFeedTitle(f.title)).catch(() => setFeedTitle('Unknown feed'))
    }
  }, [feedId])

  const load = useCallback(async () => {
    try {
      const params: any = { page, per_page: 50 }
      if (filter === 'unread') params.unread = true
      if (filter === 'saved') params.saved = true
      if (feedId) params.feed_id = Number(feedId)
      const data = await articlesApi.list(params)
      setArticles(data.items)
      setTotal(data.total)
    } catch {}
  }, [filter, page, feedId])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-[#09090b]">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
            {(['all', 'unread', 'saved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  filter === f
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {feedTitle && (
            <p className="text-xs text-gray-500 mt-2 px-1">
              Showing articles from <span className="font-medium text-gray-700 dark:text-gray-300">{feedTitle}</span>
            </p>
          )}
        </div>
        <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} groupByFeed={!feedId} />
        {total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">{page} of {Math.ceil(total / 50)}</span>
            <button
              disabled={page >= Math.ceil(total / 50)}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
