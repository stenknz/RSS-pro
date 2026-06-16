import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface Feed {
  id: number
  title: string
  url: string
  site_url: string | null
  description: string | null
  icon_url: string | null
  category_id: number | null
  enabled: boolean
  refresh_interval: number
  error_count: number
  last_fetched_at: string | null
  created_at: string
}

export interface Category {
  id: number
  name: string
  feed_count: number
  created_at: string
}

export interface Article {
  id: number
  feed_id: number
  guid: string
  title: string
  url: string | null
  author: string | null
  summary: string | null
  content: string | null
  image_url: string | null
  published_at: string | null
  is_read: boolean
  is_saved: boolean
  is_starred: boolean
  created_at: string
  feed: { id: number; title: string; icon_url: string | null } | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface Stats {
  total_feeds: number
  total_categories: number
  unread_count: number
  read_today: number
  saved_count: number
  starred_count: number
}

export const feedsApi = {
  list: (categoryId?: number) => api.get<Feed[]>('/feeds', { params: { category_id: categoryId } }).then(r => r.data),
  get: (id: number) => api.get<Feed>(`/feeds/${id}`).then(r => r.data),
  create: (data: { url: string; category_id?: number }) => api.post<Feed>('/feeds', data).then(r => r.data),
  update: (id: number, data: Partial<Feed>) => api.put<Feed>(`/feeds/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/feeds/${id}`),
  refresh: (id: number) => api.post(`/feeds/${id}/refresh`),
  refreshAll: () => api.post('/feeds/refresh-all'),
}

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then(r => r.data),
  create: (name: string) => api.post<Category>('/categories', { name }).then(r => r.data),
  update: (id: number, name: string) => api.put<Category>(`/categories/${id}`, { name }).then(r => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

export const articlesApi = {
  list: (params?: { feed_id?: number; category_id?: number; unread?: boolean; saved?: boolean; starred?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Article>>('/articles', { params }).then(r => r.data),
  get: (id: number) => api.get<Article>(`/articles/${id}`).then(r => r.data),
  update: (id: number, data: { is_read?: boolean; is_saved?: boolean; is_starred?: boolean }) =>
    api.patch<Article>(`/articles/${id}`, data).then(r => r.data),
  search: (params: { query: string; page?: number; per_page?: number; feed_id?: number; unread?: boolean; saved?: boolean }) =>
    api.post<PaginatedResponse<Article>>('/articles/search', params).then(r => r.data),
  enrich: (id: number) => api.post<Article>(`/articles/${id}/enrich`).then(r => r.data),
  cleanupContent: () => api.post<{ cleared: number; remaining_with_content: number }>('/articles/cleanup-content').then(r => r.data),
}

export const opmlApi = {
  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/opml/import', form).then(r => r.data)
  },
  export: () => api.get('/opml/export', { responseType: 'blob' }).then(r => r.data),
}

export const statsApi = {
  get: () => api.get<Stats>('/stats').then(r => r.data),
}

export const authApi = {
  me: () => api.get<{ id: number; username: string; is_admin: boolean }>('/auth/me').then(r => r.data),
  login: (username: string, password: string) => api.post<{ ok: boolean; user: { id: number; username: string; is_admin: boolean } }>('/auth/login', { username, password }).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  register: (username: string, password: string, invite_token: string) =>
    api.post('/auth/register', { username, password, invite_token }).then(r => r.data),
  createInvite: () => api.post<{ token: string; url: string }>('/auth/invites').then(r => r.data),
  listInvites: () => api.get<{ token: string; used: boolean; created_at: string }[]>('/auth/invites').then(r => r.data),
}
