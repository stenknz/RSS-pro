import { useNavigate } from 'react-router-dom'
import { Stats } from '../../api/client'

interface StatsCardsProps {
  stats: Stats | null
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const navigate = useNavigate()
  if (!stats) return null
  const cards: { label: string; value: number; color: string; to: string | null }[] = [
    { label: 'Total Feeds', value: stats.total_feeds, color: 'text-indigo-600 dark:text-indigo-400', to: null },
    { label: 'Unread', value: stats.unread_count, color: 'text-amber-600 dark:text-amber-400', to: '/articles?unread=true' },
    { label: 'Read Today', value: stats.read_today, color: 'text-emerald-600 dark:text-emerald-400', to: '/articles?read_today=true' },
    { label: 'Saved', value: stats.saved_count, color: 'text-violet-600 dark:text-violet-400', to: '/articles?saved=true' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
        const isClickable = card.to !== null
        return (
          <div
            key={card.label}
            onClick={() => isClickable && navigate(card.to!)}
            onKeyDown={(e) => isClickable && e.key === 'Enter' && navigate(card.to!)}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}
