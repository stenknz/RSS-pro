import { create } from 'zustand'
import { Category } from '../api/client'

interface CategoryState {
  categories: Category[]
  selectedCategoryId: number | null
  setCategories: (categories: Category[]) => void
  setSelectedCategoryId: (id: number | null) => void
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  selectedCategoryId: null,
  setCategories: (categories) => set({ categories }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
}))
