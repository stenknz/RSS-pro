interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-4xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
