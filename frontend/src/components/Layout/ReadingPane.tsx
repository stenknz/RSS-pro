import { Article, articlesApi } from '../../api/client'
import { useUIStore } from '../../stores/uiStore'
import EmptyState from '../EmptyState'

interface ReadingPaneProps {
  article: Article | null
  onUpdate?: (article: Article) => void
}

const widthMap = { normal: 'max-w-3xl', wide: 'max-w-5xl', full: 'max-w-full' }
const titleSizeMap = { sm: 'text-2xl', base: 'text-3xl', lg: 'text-4xl' }
const contentSizeMap = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }

export default function ReadingPane({ article, onUpdate }: ReadingPaneProps) {
  const { readingWidth, fontSize } = useUIStore()

  if (!article) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#09090b]">
        <EmptyState icon="📖" title="Select an article" description="Choose an article from the list to start reading" />
      </div>
    )
  }

  const handleToggle = async (field: 'is_read' | 'is_saved' | 'is_starred') => {
    try {
      const updated = await articlesApi.update(article.id, { [field]: !article[field] })
      onUpdate?.(updated)
    } catch {}
  }

  const Btn = ({ active, label, activeLabel, onClick, color }: { active: boolean; label: string; activeLabel: string; onClick: () => void; color: string }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
        active
          ? `${color} shadow-sm`
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {active ? activeLabel : label}
    </button>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#09090b]">
      <div className={`${widthMap[readingWidth]} mx-auto px-8 py-8`}>
        {article.image_url && (
          <div className="rounded-xl overflow-hidden mb-8 shadow-sm">
            <img
              src={article.image_url}
              alt=""
              className="w-full h-72 object-cover"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
            />
          </div>
        )}
        <h1 className={`${titleSizeMap[fontSize]} font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight tracking-tight`}>
          {article.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <span className="font-medium text-indigo-600 dark:text-indigo-400">{article.feed?.title}</span>
          {article.author && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{article.author}</span></>}
          {article.published_at && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{new Date(article.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></>}
        </div>
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <Btn active={!!article.is_read} label="Mark Read" activeLabel="Read" onClick={() => handleToggle('is_read')} color="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" />
          <Btn active={!!article.is_saved} label="Save" activeLabel="Saved" onClick={() => handleToggle('is_saved')} color="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300" />
          <Btn active={!!article.is_starred} label="Star" activeLabel="Starred" onClick={() => handleToggle('is_starred')} color="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" />
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150"
            >
              Open Original &rarr;
            </a>
          )}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
          <div
            className={`prose ${contentSizeMap[fontSize]} dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100`}
            dangerouslySetInnerHTML={{ __html: article.content || article.summary || '' }}
          />
        </div>
      </div>
    </div>
  )
}
