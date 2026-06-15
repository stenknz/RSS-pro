import { useState } from 'react'
import { articlesApi, Article } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'
import EmptyState from '../components/EmptyState'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearched(true)
    try {
      const data = await articlesApi.search({ query: query.trim() })
      setArticles(data.items)
    } catch {}
  }

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Search</button>
          </div>
        </div>
        {searched && articles.length === 0 ? (
          <EmptyState icon="🔍" title="No results" description={`No articles found for "${query}"`} />
        ) : (
          <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} />
        )}
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
