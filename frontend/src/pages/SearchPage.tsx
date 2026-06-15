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
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-[#09090b]">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSearch}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
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
