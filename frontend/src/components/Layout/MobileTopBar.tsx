import { useUIStore } from '../../stores/uiStore'

export default function MobileTopBar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09090b]">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 -ml-1 text-gray-600 dark:text-gray-400">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">RSS Reader</h1>
      <div className="w-8" />
    </div>
  )
}
