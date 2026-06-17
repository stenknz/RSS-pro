import { useState, useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'
import { authApi, articlesApi } from '../api/client'

export default function SettingsPage() {
  const { theme, setTheme, readingWidth, setReadingWidth, fontSize, setFontSize } = useUIStore()
  const [showInvites, setShowInvites] = useState(false)
  const [invites, setInvites] = useState<{ token: string; used: boolean; created_at: string }[]>([])

  useEffect(() => {
    if (showInvites) {
      authApi.listInvites().then(setInvites).catch(() => {})
    }
  }, [showInvites])

  const [cleanupMsg, setCleanupMsg] = useState('')

  const handleCleanupContent = async () => {
    setCleanupMsg('')
    try {
      const result = await articlesApi.cleanupContent()
      if (result.cleared > 0) {
        setCleanupMsg(`Cleared ${result.cleared} articles. ${result.remaining_with_content} starred articles still have full text.`)
      } else {
        setCleanupMsg('No non-starred articles had full text to clear.')
      }
    } catch {
      setCleanupMsg('Failed to clean up content.')
    }
  }

  const handleGenerateInvite = async () => {
    try {
      const result = await authApi.createInvite()
      const url = `${window.location.origin}${result.url}`
      await navigator.clipboard.writeText(url)
      alert(`Invite link copied to clipboard:\n${url}`)
      authApi.listInvites().then(setInvites).catch(() => {})
    } catch {
      alert('Failed to generate invite')
    }
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 tracking-tight">Settings</h1>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Appearance</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-accent-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reading Width</span>
              <select
                value={readingWidth}
                onChange={(e) => setReadingWidth(e.target.value as 'normal' | 'wide' | 'full')}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-accent-500"
              >
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
                <option value="full">Full</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Size</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'sm' | 'base' | 'lg')}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-accent-500"
              >
                <option value="sm">Small</option>
                <option value="base">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Data</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            <button onClick={() => window.open('/api/v1/opml/export')} className="w-full flex items-center justify-between px-5 py-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
              <span>Export OPML</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 4v11" /></svg>
            </button>
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Full-text fetched via FiveFilters is stored in the database. Clear it for non-starred articles to free up space.</p>
              <button onClick={handleCleanupContent} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Clean up content
              </button>
              {cleanupMsg && <p className="text-xs text-gray-500 dark:text-gray-400">{cleanupMsg}</p>}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Invites</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            <div className="px-5 py-4">
              <button onClick={() => setShowInvites(!showInvites)} className="text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline">
                {showInvites ? 'Hide' : 'Manage'} invite links
              </button>
            </div>
            {showInvites && (
              <>
                <div className="px-5 py-3">
                  <button onClick={handleGenerateInvite} className="px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors">
                    Generate new invite link
                  </button>
                </div>
                {invites.map((inv) => (
                  <div key={inv.token} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{inv.token.slice(0, 16)}...</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.used ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'}`}>
                      {inv.used ? 'Used' : 'Active'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
