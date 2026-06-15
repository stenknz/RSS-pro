import { useNavigate } from 'react-router-dom'
import { opmlApi, feedsApi } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'

export default function QuickActions() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.opml,.xml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          await opmlApi.import(file)
          queryClient.invalidateQueries()
          alert('Feeds imported successfully!')
        } catch {
          alert('Failed to import feeds')
        }
      }
    }
    input.click()
  }

  const handleExport = async () => {
    try {
      const blob = await opmlApi.export()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'feeds.opml'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export feeds')
    }
  }

  const handleRefreshAll = async () => {
    try {
      await feedsApi.refreshAll()
      alert('Refresh started')
    } catch {
      alert('Failed to refresh')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Quick Actions</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/feeds')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
          + Add Feed
        </button>
        <button onClick={handleRefreshAll} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200">
          Refresh All
        </button>
        <button onClick={handleImport} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200">
          Import OPML
        </button>
        <button onClick={handleExport} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200">
          Export OPML
        </button>
      </div>
    </div>
  )
}
