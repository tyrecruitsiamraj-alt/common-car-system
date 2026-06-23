/** HttpOnly cookie is the production auth transport; Bearer in localStorage is dev-only. */
export const AUTH_TOKEN_STORAGE_KEY = 'jarvis_auth_token';

export function shouldUseLocalStorageAuthToken(): boolean {
  return !import.meta.env.PROD;
}

export function readStoredAuthToken(): string | null {
  if (!shouldUseLocalStorageAuthToken()) return null;
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    return token?.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function storeAuthToken(token: string | undefined): void {
  if (!shouldUseLocalStorageAuthToken()) return;
  if (!token?.trim()) return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token.trim());
  } catch {
    /* ignore storage access errors */
  }
}

export function clearStoredAuthToken(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore storage access errors */
  }
}
