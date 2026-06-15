import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#09090b]">
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#0c0c0f]">
        <Outlet />
      </main>
    </div>
  )
}
