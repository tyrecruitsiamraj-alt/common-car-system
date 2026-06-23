/**
 * Same-origin API calls (Vite proxy in dev). Sends cookies for auth.
 */
import { readStoredAuthToken } from '@/lib/authTokenStorage';

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = readStoredAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
}
