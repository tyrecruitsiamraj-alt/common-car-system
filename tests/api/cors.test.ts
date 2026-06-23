// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { parseAllowedOrigins, resolveCors } from '../../api/_lib/cors';

describe('CORS allowlist', () => {
  beforeEach(() => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.VERCEL_ENV;
  });

  it('allows localhost origins in non-production when ALLOWED_ORIGINS unset', () => {
    expect(parseAllowedOrigins().has('http://localhost:5173')).toBe(true);
    const cors = resolveCors('http://localhost:5173');
    expect(cors.allowed).toBe(true);
    expect(cors.reflectOrigin).toBe('http://localhost:5173');
  });

  it('rejects unknown origins in production when ALLOWED_ORIGINS unset', () => {
    process.env.VERCEL_ENV = 'production';
    expect(parseAllowedOrigins().size).toBe(0);
    const cors = resolveCors('https://evil.example');
    expect(cors.allowed).toBe(false);
    expect(cors.reflectOrigin).toBeUndefined();
  });

  it('uses ALLOWED_ORIGINS when set', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://app.example,https://admin.example';
    expect(parseAllowedOrigins().has('https://app.example')).toBe(true);
    const ok = resolveCors('https://app.example');
    expect(ok.allowed).toBe(true);
    expect(ok.reflectOrigin).toBe('https://app.example');
    const bad = resolveCors('https://other.example');
    expect(bad.allowed).toBe(false);
  });

  it('allows requests with no Origin header', () => {
    process.env.VERCEL_ENV = 'production';
    const cors = resolveCors('');
    expect(cors.allowed).toBe(true);
    expect(cors.reflectOrigin).toBeUndefined();
  });
});
