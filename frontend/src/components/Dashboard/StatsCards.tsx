import { Stats } from '../../api/client'

interface StatsCardsProps {
  stats: Stats | null
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null
  const cards = [
    { label: 'Total Feeds', value: stats.total_feeds, color: 'text-blue-600' },
    { label: 'Unread', value: stats.unread_count, color: 'text-orange-600' },
    { label: 'Read Today', value: stats.read_today, color: 'text-green-600' },
    { label: 'Saved', value: stats.saved_count, color: 'text-purple-600' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
