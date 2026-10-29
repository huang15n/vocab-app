import type { Word, WordFormData, Stats } from '../types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erreur réseau');
  }
  return res.json();
}

export const api = {
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
  getStats: () => request<Stats>('/stats'),
  seed: (force = false) =>
    request<{ message: string; count: number }>(`/seed${force ? '?force=true' : ''}`, {
      method: 'POST',
    }),
};
