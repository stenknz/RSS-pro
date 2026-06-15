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
    <div className="p-8 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 tracking-tight">Dashboard</h1>
      <StatsCards stats={stats} />
      <QuickActions />

      <div className="mt-8">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Recent Feeds</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
          {recentFeeds.slice(0, 10).map((feed) => (
            <div key={feed.id} className="flex items-center gap-3 px-5 py-3.5">
              {feed.icon_url ? (
                <img src={feed.icon_url} alt="" className="w-7 h-7 rounded" />
              ) : (
                <div className="w-7 h-7 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {feed.title[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{feed.title}</p>
                <p className="text-xs text-gray-500 truncate">{feed.url}</p>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${feed.enabled ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {feed.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          ))}
          {recentFeeds.length === 0 && (
            <p className="text-sm text-gray-400 p-5 text-center">No feeds yet. Add your first feed to get started.</p>
          )}
        </div>
      </div>
    </div>
  )
}
