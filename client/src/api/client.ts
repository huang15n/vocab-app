const BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('vocab_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('vocab_token', token);
  else localStorage.removeItem('vocab_token');
}

export class ApiError extends Error {
  status: number
  error?: string
  duplicates?: string[]
  existing?: { id: number; word: string }

  constructor(status: number, body: any) {
    super(body?.message || body?.error || 'Erreur réseau')
    this.name = 'ApiError'
    this.status = status
    this.error = body?.error
    this.duplicates = body?.duplicates
    this.existing = body?.existing
  }
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, { error: 'Non authentifié' });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body);
  }
  // export endpoints return blob handled elsewhere
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.json();
}
