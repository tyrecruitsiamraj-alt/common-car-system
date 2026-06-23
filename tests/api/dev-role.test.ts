// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('dev-role login gate', () => {
  beforeEach(() => {
    delete process.env.JARVIS_DEV_ROLE_LOGIN;
    vi.resetModules();
  });

  async function loadDevRoleAllowed(): Promise<boolean> {
    const mod = await import('../../api/_handlers/auth/dev-role');
    const handler = mod.default;
    const res = {
      statusCode: 0,
      body: null as unknown,
      setHeader: vi.fn(),
      status(code: number) {
        this.statusCode = code;
        return {
          json: (b: unknown) => {
            this.body = b;
          },
        };
      },
    };
    await handler(
      { method: 'POST', body: { role: 'admin' }, headers: {} },
      res as never,
    );
    return res.statusCode !== 403;
  }

  it('is disabled by default', async () => {
    const allowed = await loadDevRoleAllowed();
    expect(allowed).toBe(false);
  });

  it('is enabled when JARVIS_DEV_ROLE_LOGIN=true', async () => {
    process.env.JARVIS_DEV_ROLE_LOGIN = 'true';
    process.env.AUTH_JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
    const allowed = await loadDevRoleAllowed();
    // May be 404 (no user) or 503 (no jwt) but not 403 disabled
    expect(allowed).toBe(true);
  });
});
