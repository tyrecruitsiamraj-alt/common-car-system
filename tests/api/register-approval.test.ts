// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../api/_lib/postgres.js', () => ({
  dbQuery: vi.fn(),
}));

import { dbQuery } from '../../api/_lib/postgres.js';
import { _resetRateLimitsForTests } from '../../api/_lib/rateLimit.js';
import registerHandler from '../../api/_handlers/auth/register.js';
import loginHandler from '../../api/_handlers/auth/login.js';

const mockedDbQuery = vi.mocked(dbQuery);
const PASSWORD = 'correct-password-1';

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

const signUp = (extra: Record<string, unknown> = {}) => ({
  method: 'POST',
  headers: {},
  body: { email: 'it.dev@qa.invalid', password: PASSWORD, first_name: 'IT', last_name: 'DEV', ...extra },
});

const logIn = (password: string) => ({
  method: 'POST',
  headers: {},
  body: { email: 'it.dev@qa.invalid', password },
});

async function userRow(isActive: boolean) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'it.dev@qa.invalid',
    password_hash: await bcrypt.hash(PASSWORD, 4),
    role: 'staff',
    full_name: 'IT DEV',
    is_active: isActive,
    created_at: '2026-11-05',
  };
}

describe('sign-up needs admin approval', () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
    mockedDbQuery.mockReset();
    _resetRateLimitsForTests();
  });

  it('creates the account as inactive staff, even if the body asks for admin', async () => {
    mockedDbQuery.mockResolvedValue({ rows: [{ ...(await userRow(false)) }] });
    const { out, res } = makeRes();
    await registerHandler(signUp({ role: 'admin', is_active: true }), res as never);
    expect(out.status).toBe(201);
    const [sql, params] = mockedDbQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/is_active\)\s*values \(lower\(\$1::text\), \$2, \$3, \$4, false\)/);
    expect(params[2]).toBe('staff');
    expect(params).not.toContain(true);
  });

  it('limits sign-ups from one address', async () => {
    mockedDbQuery.mockResolvedValue({ rows: [{ ...(await userRow(false)) }] });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const { out, res } = makeRes();
      await registerHandler(signUp({ password: 'x'.repeat(4) }), res as never);
      statuses.push(out.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 400)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('blocks login while pending, with no cookie', async () => {
    mockedDbQuery.mockResolvedValue({ rows: [await userRow(false)] });
    const { out, res } = makeRes();
    await loginHandler(logIn(PASSWORD), res as never);
    expect(out.status).toBe(403);
    expect(JSON.stringify(out.body)).toContain('pending approval');
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('does not reveal pending status to someone with the wrong password', async () => {
    mockedDbQuery.mockResolvedValue({ rows: [await userRow(false)] });
    const { out, res } = makeRes();
    await loginHandler(logIn('wrong-password'), res as never);
    expect(out.status).toBe(401);
    expect(JSON.stringify(out.body)).not.toContain('pending');
  });

  it('allows login once approved', async () => {
    mockedDbQuery.mockResolvedValue({ rows: [await userRow(true)] });
    const { out, res } = makeRes();
    await loginHandler(logIn(PASSWORD), res as never);
    expect(out.status).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('HttpOnly'));
  });
});
