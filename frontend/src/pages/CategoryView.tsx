import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { articlesApi, feedsApi, categoriesApi, Article, Feed } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'
import EmptyState from '../components/EmptyState'

export default function CategoryView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [categoryName, setCategoryName] = useState('')

  useEffect(() => {
    if (!id) return
    categoriesApi.list().then(cats => {
      const cat = cats.find(c => c.id === Number(id))
      if (cat) setCategoryName(cat.name)
    }).catch(() => {})
    // Load articles for ALL feeds in this category
    feedsApi.list(Number(id)).then((feeds) => {
      if (feeds.length > 0) {
        const feedIds = feeds.map((f: Feed) => f.id)
        articlesApi.list({ feed_id: feedIds[0], unread: true }).then(data => {
          setArticles(data.items)
        }).catch(() => {})
      }
    }).catch(() => {})
  }, [id])

  if (!id) {
    return <EmptyState icon="📁" title="Category not found" description="Select a category from the sidebar" />
  }

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-[#09090b]">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{categoryName || 'Category'}</h2>
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
