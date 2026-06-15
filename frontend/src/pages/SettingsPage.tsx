import { useUIStore } from '../stores/uiStore'

export default function SettingsPage() {
  const { theme, setTheme, readingWidth, setReadingWidth, fontSize, setFontSize } = useUIStore()

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
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500"
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
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500"
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
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500"
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
          </div>
        </section>
      </div>
    </div>
  )
}
