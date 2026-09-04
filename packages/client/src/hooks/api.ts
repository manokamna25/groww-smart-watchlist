import { useAuthStore } from '../store/auth.store';

const BASE_URL = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ user: { id: string; email: string }; token: string }>('/auth/register', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string }; token: string }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
  },
  watchlists: {
    list: () => request<any[]>('/watchlists'),
    create: (name: string) => request<any>('/watchlists', { method: 'POST', body: JSON.stringify({ name }) }),
    summary: (id: string) => request<any>(`/watchlists/${id}/summary`),
    addItem: (id: string, symbol: string) =>
      request<any>(`/watchlists/${id}/items`, { method: 'POST', body: JSON.stringify({ symbol }) }),
    removeItem: (id: string, symbol: string) =>
      request<any>(`/watchlists/${id}/items/${symbol}`, { method: 'DELETE' }),
    ackItem: (id: string, symbol: string) =>
      request<any>(`/watchlists/${id}/items/${symbol}/ack`, { method: 'POST' }),
  },
  intelligence: {
    breakdown: (eventId: string) => request<any>(`/intelligence/events/${eventId}/breakdown`),
    ack: (eventId: string) => request<any>(`/intelligence/events/${eventId}/ack`, { method: 'POST' }),
  },
  dev: {
    injectEvent: (symbol: string, type: string) =>
      request<any>('/dev/inject-event', { method: 'POST', body: JSON.stringify({ symbol, type }) }),
  },
};
