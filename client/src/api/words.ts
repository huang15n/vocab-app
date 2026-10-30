import { request } from './client';
import type { Word, WordFormData, Stats, StudySet, Flashcard, QuizQuestion, Progress, User } from '../types';

export const api = {
  // Auth
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<{ user: User }>('/auth/me'),

  // Words
  getWords: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Word[]>(`/words${qs}`);
  },
  getWord: (id: number) => request<Word>(`/words/${id}`),
  createWord: (data: WordFormData) =>
    request<Word>('/words', { method: 'POST', body: JSON.stringify(data) }),
  updateWord: (id: number, data: Partial<WordFormData>) =>
    request<Word>(`/words/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWord: (id: number) =>
    request<{ message: string }>(`/words/${id}`, { method: 'DELETE' }),

  // Import
  importFile: (file: File, setId?: number) => {
    const fd = new FormData();
    fd.append('file', file);
    if (setId) fd.append('setId', String(setId));
    return request<{ message: string; created: number; skipped: number }>('/import', {
      method: 'POST',
      body: fd,
    });
  },

  // Sets
  getSets: () => request<StudySet[]>('/sets'),
  getSet: (id: number) => request<StudySet>(`/sets/${id}`),
  createSet: (data: { name: string; description?: string; wordIds?: number[] }) =>
    request<StudySet>('/sets', { method: 'POST', body: JSON.stringify(data) }),
  updateSet: (id: number, data: Partial<StudySet>) =>
    request<StudySet>(`/sets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSet: (id: number) =>
    request<{ message: string }>(`/sets/${id}`, { method: 'DELETE' }),
  addWordsToSet: (id: number, wordIds: number[]) =>
    request<StudySet>(`/sets/${id}/words`, { method: 'POST', body: JSON.stringify({ wordIds }) }),

  // Study
  getCards: (setId: number) => request<Flashcard[]>(`/study/${setId}/cards`),
  getQuiz: (setId: number, limit = 15) =>
    request<{ questions: QuizQuestion[]; setName: string }>(`/study/${setId}/quiz?limit=${limit}`),
  checkAnswer: (wordId: number, answer: string, type: 'mcq' | 'write') =>
    request<{ correct: boolean; correctAnswer: string; word: string; progress: Progress }>(
      '/study/quiz/check',
      { method: 'POST', body: JSON.stringify({ wordId, answer, type }) }
    ),
  review: (wordId: number, quality: number) =>
    request<{ progress: Progress; word: Word }>('/progress/review', {
      method: 'POST',
      body: JSON.stringify({ wordId, quality }),
    }),
  getDue: (setId?: number) => {
    const qs = setId ? `?setId=${setId}` : '';
    return request<{ word: Word; progress: Progress }[]>(`/progress/due${qs}`);
  },

  // Stats & seed
  getStats: () => request<Stats>('/stats'),
  seed: (force = false) =>
    request<{ message: string; count: number; setId: number }>(`/seed${force ? '?force=true' : ''}`, {
      method: 'POST',
    }),
};
