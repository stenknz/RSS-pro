import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { articlesApi, feedsApi, categoriesApi, Article, Feed } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'

export default function CategoryView() {
  const { id } = useParams<{ id: string }>()
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [categoryName, setCategoryName] = useState('')

  useEffect(() => {
    if (!id) return
    categoriesApi.list().then(cats => {
      const cat = cats.find(c => c.id === Number(id))
      if (cat) setCategoryName(cat.name)
    }).catch(() => {})
    feedsApi.list(Number(id)).then((feeds) => {
      if (feeds.length > 0) {
        articlesApi.list({ feed_id: feeds[0].id, unread: true }).then(data => {
          setArticles(data.items)
        }).catch(() => {})
      }
    }).catch(() => {})
  }, [id])

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{categoryName}</h2>
        </div>
        <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} />
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
