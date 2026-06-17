import { useState } from 'react'
import { Article } from '../../api/client'

const FEED_COLORS = [
  'bg-accent-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-violet-500', 'bg-rose-500',
  'bg-teal-500', 'bg-orange-500',
]

const UNREAD_COLORS = [
  'bg-accent-400', 'bg-sky-400', 'bg-emerald-400',
  'bg-amber-400', 'bg-violet-400', 'bg-rose-400',
  'bg-teal-400', 'bg-orange-400',
]

function feedColorIndex(feedId: number | undefined): number {
  if (!feedId) return 0
  return ((feedId * 7 + 3) % FEED_COLORS.length + FEED_COLORS.length) % FEED_COLORS.length
}

interface ArticleListProps {
  articles: Article[]
  selectedId: number | null
  onSelect: (article: Article) => void
  groupByFeed?: boolean
}

interface FeedGroup {
  key: string
  feedTitle: string
  iconUrl: string | null
  feedId: number | undefined
  articles: Article[]
}

const NULL_FEED = 'orphaned'

function ArticleItem({ article, selectedId, onSelect }: { article: Article; selectedId: number | null; onSelect: (a: Article) => void }) {
  const cIdx = feedColorIndex(article.feed?.id)
  return (
    <div
      onClick={() => onSelect(article)}
      className={`px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-900 ${
        selectedId === article.id ? 'bg-accent-50/50 dark:bg-accent-950/20' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-0.5 flex-shrink-0 self-stretch rounded-full ${
            !article.is_read ? UNREAD_COLORS[cIdx] : 'bg-transparent'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${FEED_COLORS[cIdx]}`} />
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">{article.feed?.title || 'Unknown'}</span>
            {article.published_at && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">· {new Date(article.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
          <h3 className={`text-sm leading-snug font-serif ${!article.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-600 dark:text-gray-400'}`}>
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2 leading-relaxed">{article.summary}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-300 dark:text-gray-600">
            {!!article.is_saved && (
              <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3-5 3V4z" /></svg>
            )}
            {!!article.is_starred && (
              <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ArticleList({ articles, selectedId, onSelect, groupByFeed }: ArticleListProps) {
  const [collapsedFeeds, setCollapsedFeeds] = useState<Set<string>>(new Set())

  const toggleFeed = (key: string) => {
    setCollapsedFeeds(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (articles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No articles
      </div>
    )
  }

  if (groupByFeed) {
    const groups: FeedGroup[] = []
    const map = new Map<string, FeedGroup>()
    for (const article of articles) {
      const key = article.feed ? String(article.feed.id) : NULL_FEED
      if (!map.has(key)) {
        map.set(key, {
          key,
          feedTitle: article.feed?.title || 'Orphaned',
          iconUrl: article.feed?.icon_url ?? null,
          feedId: article.feed?.id,
          articles: [],
        })
      }
      map.get(key)!.articles.push(article)
    }
    groups.push(...map.values())

    return (
      <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
        {groups.map((group) => (
          <div key={group.key}>
            <div
              onClick={() => toggleFeed(group.key)}
              className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/95 transition-colors"
            >
              {group.iconUrl ? (
                <img src={group.iconUrl} alt="" className="w-5 h-5 rounded" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${FEED_COLORS[feedColorIndex(group.feedId)]}`}>
                  {group.feedTitle[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{group.feedTitle}</span>
              <span className="ml-auto text-[11px] text-gray-400">{group.articles.length}</span>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${collapsedFeeds.has(group.key) ? '' : 'rotate-180'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedFeeds.has(group.key) && group.articles.map((article) => (
              <ArticleItem key={article.id} article={article} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
      {articles.map((article) => (
        <ArticleItem key={article.id} article={article} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  )
}
