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
          className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-900 ${
            selectedId === article.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
          }`}
        >
          <div className={`pl-3 ${!article.is_read ? 'border-l-[3px] border-indigo-500' : 'border-l-[3px] border-transparent'}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm leading-snug ${!article.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-700 dark:text-gray-300'}`}>
                  {article.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2 leading-relaxed">{article.summary}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="font-medium">{article.feed?.title || 'Unknown'}</span>
              {article.author && <span>· {article.author}</span>}
              {article.published_at && (
                <span>· {new Date(article.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              )}
                </div>
              </div>
              <div className="flex items-start gap-1.5 flex-shrink-0 pt-0.5 min-w-[24px]">
                {!!article.is_saved && (
                  <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3-5 3V4z" /></svg>
                )}
                {!!article.is_starred && (
                  <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
