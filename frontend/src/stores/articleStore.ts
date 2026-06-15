import { create } from 'zustand'
import { Article } from '../api/client'

interface ArticleState {
  articles: Article[]
  selectedArticleId: number | null
  total: number
  page: number
  setArticles: (articles: Article[], total: number) => void
  setSelectedArticleId: (id: number | null) => void
  setPage: (page: number) => void
}

export const useArticleStore = create<ArticleState>((set) => ({
  articles: [],
  selectedArticleId: null,
  total: 0,
  page: 1,
  setArticles: (articles, total) => set({ articles, total }),
  setSelectedArticleId: (selectedArticleId) => set({ selectedArticleId }),
  setPage: (page) => set({ page }),
}))
