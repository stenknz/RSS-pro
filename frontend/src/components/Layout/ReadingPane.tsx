import { Article, articlesApi } from '../../api/client'
import EmptyState from '../EmptyState'

interface ReadingPaneProps {
  article: Article | null
  onUpdate?: (article: Article) => void
}

export default function ReadingPane({ article, onUpdate }: ReadingPaneProps) {
  if (!article) {
    return <EmptyState icon="📖" title="Select an article" description="Choose an article from the list to start reading" />
  }

  const handleToggle = async (field: 'is_read' | 'is_saved' | 'is_starred') => {
    try {
      const updated = await articlesApi.update(article.id, { [field]: !article[field] })
      onUpdate?.(updated)
    } catch {}
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        {article.image_url && (
          <img src={article.image_url} alt="" className="w-full h-64 object-cover rounded-lg mb-6" />
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{article.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
          <span>{article.feed?.title}</span>
          {article.author && <span>· {article.author}</span>}
          {article.published_at && <span>· {new Date(article.published_at).toLocaleDateString()}</span>}
        </div>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleToggle('is_read')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              article.is_read ? 'bg-gray-100 dark:bg-gray-800 text-gray-600' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            }`}
          >
            {article.is_read ? 'Mark Unread' : 'Mark Read'}
          </button>
          <button
            onClick={() => handleToggle('is_saved')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              article.is_saved ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            {article.is_saved ? 'Unsave' : 'Save'}
          </button>
          <button
            onClick={() => handleToggle('is_starred')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              article.is_starred ? 'bg-red-100 dark:bg-red-900 text-red-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            {article.is_starred ? 'Unstar' : 'Star'}
          </button>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
            >
              Open Original
            </a>
          )}
        </div>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content || article.summary || '' }}
        />
      </div>
    </div>
  )
}
