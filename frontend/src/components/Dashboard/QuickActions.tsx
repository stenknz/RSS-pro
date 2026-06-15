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
          const result = await opmlApi.import(file)
          queryClient.invalidateQueries()
          if (result.imported === 0) {
            alert('No new feeds found. The feeds may already be in your list.')
          } else {
            alert(`Imported ${result.imported} feed${result.imported !== 1 ? 's' : ''} successfully!`)
          }
        } catch (e: any) {
          const msg = e?.response?.data?.detail || e?.message || 'Unknown error'
          alert(`Failed to import feeds: ${msg}`)
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/feeds')} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Feed
        </button>
        <button onClick={handleRefreshAll} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh All
        </button>
        <button onClick={handleImport} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
          Import OPML
        </button>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 4v11" /></svg>
          Export OPML
        </button>
      </div>
    </div>
  )
}
