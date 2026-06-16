import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { articlesApi, Article } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'
import EmptyState from '../components/EmptyState'

export default function SavedView() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)

  useEffect(() => {
    articlesApi.list({ saved: true }).then((data) => setArticles(data.items)).catch(() => {})
  }, [])

  if (articles.length === 0) {
    return (
      <EmptyState
        icon="⭐"
        title="No saved articles"
        description="Save articles while reading to find them here later"
      />
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-[#09090b]">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saved Articles</h2>
        </div>
        <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={(article) => {
          setSelected(article)
          if (window.innerWidth < 768) {
            navigate(`/articles/${article.id}`)
          }
        }} />
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
