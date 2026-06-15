import { useEffect, useState, useCallback } from 'react'
import { articlesApi, Article } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'

export default function AllArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'saved'>('unread')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, per_page: 50 }
      if (filter === 'unread') params.unread = true
      if (filter === 'saved') params.saved = true
      const data = await articlesApi.list(params)
      setArticles(data.items)
      setTotal(data.total)
    } catch {}
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-1">
            {(['all', 'unread', 'saved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  filter === f
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} />
        {total > 50 && (
          <div className="flex justify-center gap-2 p-3 border-t border-gray-200 dark:border-gray-800">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50">Prev</button>
            <span className="text-xs text-gray-500 self-center">{page} / {Math.ceil(total / 50)}</span>
            <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50">Next</button>
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
