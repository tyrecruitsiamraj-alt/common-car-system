// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../api/_lib/postgres.js', () => ({
  dbQuery: vi.fn(),
}));

import { dbQuery } from '../../api/_lib/postgres.js';
import { AUTH_COOKIE_NAME, generateTemporaryPassword, signAuthToken, type UserRole } from '../../api/_lib/auth.js';
import { apiRoutes } from '../../api/_handlers/registry.js';

const mockedDbQuery = vi.mocked(dbQuery);
const USER_ID = '11111111-1111-4111-8111-111111111111';

function makeRes() {
  const out = { status: 0, body: null as unknown };
  return {
    out,
    res: {
      setHeader: vi.fn(),
      status(code: number) {
        out.status = code;
        return {
          json: (b: unknown) => {
            out.body = b;
          },
        };
      },
    },
  };
}

function reqAs(role: UserRole, body: unknown) {
  const token = signAuthToken({ sub: USER_ID, email: `${role}@qa.invalid`, role });
  return { method: 'POST', body, headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` } };
}

describe('password reset', () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
    mockedDbQuery.mockReset();
  });

  it('no longer exposes a public forgot-password route', () => {
    expect(apiRoutes['/api/auth/forgot-password']).toBeUndefined();
  });

  it('rejects reset without a session', async () => {
    const { out, res } = makeRes();
    await apiRoutes['/api/app-users']({ method: 'POST', body: { id: USER_ID, action: 'reset_password' }, headers: {} }, res as never);
    expect(out.status).toBe(401);
    expect(mockedDbQuery).not.toHaveBeenCalled();
  });

  it.each(['staff', 'supervisor'] as UserRole[])('rejects reset by %s', async (role) => {
    const { out, res } = makeRes();
    await apiRoutes['/api/app-users'](reqAs(role, { id: USER_ID, action: 'reset_password' }), res as never);
    expect(out.status).toBe(403);
    expect(mockedDbQuery).not.toHaveBeenCalled();
  });

  it('lets an admin reset, storing only a hash of the returned password', async () => {
    mockedDbQuery.mockResolvedValue({ rows: [{ id: USER_ID }] });
    const { out, res } = makeRes();
    await apiRoutes['/api/app-users'](reqAs('admin', { id: USER_ID, action: 'reset_password' }), res as never);
    expect(out.status).toBe(200);
    const password = (out.body as { temporary_password: string }).temporary_password;
    const [hash, id] = mockedDbQuery.mock.calls[0][1] as [string, string];
    expect(id).toBe(USER_ID);
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it('returns 404 for an unknown user', async () => {
    mockedDbQuery.mockResolvedValue({ rows: [] });
    const { out, res } = makeRes();
    await apiRoutes['/api/app-users'](reqAs('admin', { id: USER_ID, action: 'reset_password' }), res as never);
    expect(out.status).toBe(404);
  });

  it('rejects an unknown action', async () => {
    const { out, res } = makeRes();
    await apiRoutes['/api/app-users'](reqAs('admin', { id: USER_ID, action: 'nope' }), res as never);
    expect(out.status).toBe(400);
    expect(mockedDbQuery).not.toHaveBeenCalled();
  });

  it('generates long, varied temporary passwords', () => {
    const passwords = new Set(Array.from({ length: 50 }, () => generateTemporaryPassword()));
    expect(passwords.size).toBe(50);
    for (const p of passwords) expect(p.length).toBeGreaterThanOrEqual(14);
  });
});
