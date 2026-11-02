import { request } from './client'
import type { Word, WordFormData, Stats, StudySet, Flashcard, QuizQuestion, Progress, User } from '../types'

export const api = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<{ user: User }>('/auth/me'),

  getWords: (lang: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Word[]>(`/${lang}/words${qs}`)
  },
  getWord: (lang: string, id: number) => request<Word>(`/${lang}/words/${id}`),
  createWord: (lang: string, data: WordFormData) =>
    request<Word>(`/${lang}/words`, { method: 'POST', body: JSON.stringify(data) }),
  updateWord: (lang: string, id: number, data: Partial<WordFormData>) =>
    request<Word>(`/${lang}/words/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWord: (lang: string, id: number) =>
    request<{ message: string }>(`/${lang}/words/${id}`, { method: 'DELETE' }),
  bulkDelete: (lang: string, ids: number[]) =>
    request<{ message: string; deleted: number }>(`/${lang}/words/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  importFile: (lang: string, file: File, setId?: number) => {
    const fd = new FormData()
    fd.append('file', file)
    if (setId) fd.append('setId', String(setId))
    return request<{ message: string; created: number; skipped: number }>(`/${lang}/import`, {
      method: 'POST',
      body: fd,
    })
  },

  getSets: (lang?: string) => {
    const qs = lang ? `?lang=${lang}` : ''
    return request<StudySet[]>(`/sets${qs}`)
  },
  getSet: (id: number) => request<StudySet>(`/sets/${id}`),
  createSet: (data: { name: string; description?: string; wordIds?: number[]; lang: string }) =>
    request<StudySet>('/sets', { method: 'POST', body: JSON.stringify(data) }),
  updateSet: (id: number, data: Partial<StudySet>) =>
    request<StudySet>(`/sets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSet: (id: number) => request<{ message: string }>(`/sets/${id}`, { method: 'DELETE' }),

  getCards: (setId: number) => request<Flashcard[]>(`/study/${setId}/cards`),
  getQuiz: (setId: number, limit = 15) =>
    request<{ questions: QuizQuestion[]; setName: string; lang?: string }>(
      `/study/${setId}/quiz?limit=${limit}`
    ),
  checkAnswer: (wordId: number, answer: string, type: 'mcq' | 'write', lang: string) =>
    request<{ correct: boolean; correctAnswer: string; word: string; progress: Progress }>(
      '/study/quiz/check',
      { method: 'POST', body: JSON.stringify({ wordId, answer, type, lang }) }
    ),
  review: (wordId: number, quality: number, lang: string) =>
    request<{ progress: Progress; word: Word }>('/progress/review', {
      method: 'POST',
      body: JSON.stringify({ wordId, quality, lang }),
    }),

  getStats: (lang?: string) => {
    const qs = lang ? `?lang=${lang}` : ''
    return request<Stats & { byLang?: Record<string, number> }>(`/stats${qs}`)
  },
  
  exportWords: async (lang: string, format: 'csv' | 'xlsx' = 'csv') => {
    const { getToken } = await import('./client')
    const token = getToken()
    const res = await fetch(`/api/${lang}/export?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Export failed')
    }
    const blob = await res.blob()
    const dispo = res.headers.get('Content-Disposition') || ''
    const match = dispo.match(/filename="?([^";]+)"?/)
    const filename = match?.[1] || `vocab-${lang}.${format === 'xlsx' ? 'xlsx' : 'csv'}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return { filename }
  },

  seed: (lang: string, force = false) =>
    request<{ message: string; count: number; setId: number }>(
      `/seed?lang=${lang}${force ? '&force=true' : ''}`,
      { method: 'POST', body: JSON.stringify({ lang }) }
    ),

  // ---- Visual dictionary ----

  getThemes: () => request<any[]>('/themes'),
  getTheme: (id: number) => request<any>(`/themes/${id}`),
  createTheme: (data: any) => request<any>('/themes', { method: 'POST', body: JSON.stringify(data) }),
  updateTheme: (id: number, data: any) =>
    request<any>(`/themes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTheme: (id: number) => request<{ message: string }>(`/themes/${id}`, { method: 'DELETE' }),

  getVisual: (lang: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/${lang}/visual${qs}`)
  },
  getVisualWord: (lang: string, id: number) => request<any>(`/${lang}/visual/${id}`),
  createVisual: (lang: string, formData: FormData) =>
    request<any>(`/${lang}/visual`, { method: 'POST', body: formData }),
  updateVisual: (lang: string, id: number, formData: FormData) =>
    request<any>(`/${lang}/visual/${id}`, { method: 'PUT', body: formData }),
  deleteVisual: (lang: string, id: number) =>
    request<{ message: string }>(`/${lang}/visual/${id}`, { method: 'DELETE' }),
  bulkDeleteVisual: (lang: string, ids: number[]) =>
    request<{ deleted: number }>(`/${lang}/visual/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  importVisual: (lang: string, themeId: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('themeId', String(themeId))
    return request<{ message: string; created: number; duplicates?: string[] }>(
      `/${lang}/visual-import`,
      { method: 'POST', body: fd }
    )
  },
  exportVisual: async (lang: string, themeId: number, format: 'csv' | 'xlsx' = 'csv') => {
    const { getToken } = await import('./client')
    const token = getToken()
    const res = await fetch(`/api/${lang}/visual-export?themeId=${themeId}&format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Export failed')
    }
    const blob = await res.blob()
    const dispo = res.headers.get('Content-Disposition') || ''
    const match = dispo.match(/filename="?([^";]+)"?/)
    const filename = match?.[1] || `visual-${lang}.${format}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return { filename }
  },
}
