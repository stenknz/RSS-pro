import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  readingWidth: 'normal' | 'wide' | 'full'
  fontSize: 'sm' | 'base' | 'lg'
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setReadingWidth: (w: 'normal' | 'wide' | 'full') => void
  setFontSize: (s: 'sm' | 'base' | 'lg') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      readingWidth: 'normal',
      fontSize: 'base',
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setReadingWidth: (readingWidth) => set({ readingWidth }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: 'rss-ui-prefs' },
  ),
)
