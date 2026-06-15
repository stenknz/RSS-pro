import { create } from 'zustand'
import { Feed } from '../api/client'

interface FeedState {
  feeds: Feed[]
  selectedFeedId: number | null
  setFeeds: (feeds: Feed[]) => void
  setSelectedFeedId: (id: number | null) => void
}

export const useFeedStore = create<FeedState>((set) => ({
  feeds: [],
  selectedFeedId: null,
  setFeeds: (feeds) => set({ feeds }),
  setSelectedFeedId: (selectedFeedId) => set({ selectedFeedId }),
}))
