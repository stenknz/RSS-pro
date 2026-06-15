import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
