import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { Article, articlesApi } from '../../api/client'
import { useUIStore } from '../../stores/uiStore'
import EmptyState from '../EmptyState'

interface ReadingPaneProps {
  article: Article | null
  onUpdate?: (article: Article) => void
  onBack?: () => void
}

const widthMap = { normal: 'max-w-3xl', wide: 'max-w-5xl', full: 'max-w-full' }
const titleSizeMap = { sm: 'text-2xl', base: 'text-3xl', lg: 'text-4xl' }
const contentSizeMap = { sm: 'prose-sm', base: 'prose-base', lg: 'prose-lg' }

export default function ReadingPane({ article, onUpdate, onBack }: ReadingPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { readingWidth, fontSize } = useUIStore()
  const [imgError, setImgError] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState('')

  useEffect(() => {
    if (!article) return
    setImgError(false)
    setEnrichError('')
    scrollRef.current?.scrollTo(0, 0)
    if (!article.is_read) {
      articlesApi.update(article.id, { is_read: true }).then(onUpdate).catch(() => {})
    }
  }, [article?.id])

  const handleEnrich = async () => {
    if (!article) return
    setEnriching(true)
    setEnrichError('')
    try {
      const updated = await articlesApi.enrich(article.id)
      onUpdate?.(updated)
    } catch {
      setEnrichError('Failed to fetch full text')
    } finally {
      setEnriching(false)
    }
  }

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
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white dark:bg-[#09090b]">
      <div className={`${widthMap[readingWidth]} mx-auto px-4 md:px-8 py-8`}>
        {onBack && (
          <button onClick={onBack} className="md:hidden flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4 hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        {article.image_url && !imgError && (
          <div className="rounded-xl overflow-hidden mb-8 shadow-sm">
            <img
              src={article.image_url}
              alt=""
              className="w-full h-72 object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        )}
        <h1 className={`${titleSizeMap[fontSize]} font-semibold font-serif text-gray-900 dark:text-gray-100 mb-4 leading-tight tracking-tight`}>
          {article.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <div className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" />
          <span className="font-semibold text-accent-600 dark:text-accent-400 uppercase tracking-wider text-xs">{article.feed?.title}</span>
          {article.author && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{article.author}</span></>}
          {article.published_at && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{new Date(article.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></>}
        </div>
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <Btn active={!!article.is_read} label="Mark Read" activeLabel="Read" onClick={() => handleToggle('is_read')} color="bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300" />
          <Btn active={!!article.is_saved} label="Save" activeLabel="Saved" onClick={() => handleToggle('is_saved')} color="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300" />
          <Btn active={!!article.is_starred} label="Star" activeLabel="Starred" onClick={() => handleToggle('is_starred')} color="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" />
          {article.url && !article.content && (
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-all duration-150 disabled:opacity-50"
            >
              {enriching ? 'Fetching...' : 'Fetch full text'}
            </button>
          )}
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
        {enrichError && (
          <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {enrichError}
          </div>
        )}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
          <div
            className={`prose ${contentSizeMap[fontSize]} dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-a:text-accent-600 dark:prose-a:text-accent-400 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-headings:font-serif prose-p:font-serif`}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content || article.summary || '') }}
          />
        </div>
      </div>
    </div>
  )
}
