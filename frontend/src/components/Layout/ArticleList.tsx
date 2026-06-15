import { Article } from '../../api/client'

interface ArticleListProps {
  articles: Article[]
  selectedId: number | null
  onSelect: (article: Article) => void
}

export default function ArticleList({ articles, selectedId, onSelect }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No articles
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
      {articles.map((article) => (
        <div
          key={article.id}
          onClick={() => onSelect(article)}
          className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
            selectedId === article.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          } ${!article.is_read ? 'border-l-2 border-l-blue-500' : ''}`}
        >
          <div className="flex gap-3">
            {article.image_url && (
              <img src={article.image_url} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className={`text-sm ${!article.is_read ? 'font-semibold' : 'font-normal'} text-gray-900 dark:text-gray-100 truncate`}>
                {article.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{article.feed?.title}</span>
                {article.author && <span>· {article.author}</span>}
                {article.published_at && (
                  <span>· {new Date(article.published_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {article.is_saved && <span className="text-yellow-500 text-xs">⭐</span>}
              {article.is_starred && <span className="text-red-500 text-xs">❤️</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
