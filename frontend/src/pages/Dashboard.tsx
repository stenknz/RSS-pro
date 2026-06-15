import { useEffect, useState } from 'react'
import { statsApi, feedsApi, Stats, Feed } from '../api/client'
import StatsCards from '../components/Dashboard/StatsCards'
import QuickActions from '../components/Dashboard/QuickActions'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentFeeds, setRecentFeeds] = useState<Feed[]>([])

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => {})
    feedsApi.list().then(setRecentFeeds).catch(() => {})
  }, [])

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>
      <StatsCards stats={stats} />
      <QuickActions />

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Recent Feeds</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          {recentFeeds.slice(0, 10).map((feed) => (
            <div key={feed.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              {feed.icon_url ? (
                <img src={feed.icon_url} alt="" className="w-6 h-6 rounded" />
              ) : (
                <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs text-blue-600">
                  R
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{feed.title}</p>
                <p className="text-xs text-gray-500 truncate">{feed.url}</p>
              </div>
              <span className={`text-xs ${feed.enabled ? 'text-green-500' : 'text-red-500'}`}>
                {feed.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          ))}
          {recentFeeds.length === 0 && (
            <p className="text-sm text-gray-400 p-4 text-center">No feeds yet. Add your first feed!</p>
          )}
        </div>
      </div>
    </div>
  )
}
