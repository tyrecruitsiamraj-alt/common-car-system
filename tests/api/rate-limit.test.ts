// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  enforceRateLimit,
  _resetRateLimitsForTests,
} from '../../api/_lib/rateLimit';

describe('rate limiting', () => {
  beforeEach(() => {
    _resetRateLimitsForTests();
    delete process.env.AUTH_RATE_LIMIT_LOGIN_MAX;
    delete process.env.AUTH_RATE_LIMIT_LOGIN_WINDOW_MS;
  });

  it('allows requests under the limit', () => {
    expect(checkRateLimit('login:1.2.3.4', 3, 60_000)).toBe(true);
    expect(checkRateLimit('login:1.2.3.4', 3, 60_000)).toBe(true);
    expect(checkRateLimit('login:1.2.3.4', 3, 60_000)).toBe(true);
    expect(checkRateLimit('login:1.2.3.4', 3, 60_000)).toBe(false);
  });

  it('returns 429 from enforceRateLimit when exceeded', () => {
    process.env.AUTH_RATE_LIMIT_LOGIN_MAX = '2';
    process.env.AUTH_RATE_LIMIT_LOGIN_WINDOW_MS = '60000';
    const req = { headers: { 'x-forwarded-for': '9.9.9.9' } };
    const calls: Array<{ code: number; body: unknown }> = [];
    const res = {
      status(code: number) {
        return {
          json(body: unknown) {
            calls.push({ code, body });
          },
        };
      },
    };

    expect(enforceRateLimit(req, res, 'login')).toBe(true);
    expect(enforceRateLimit(req, res, 'login')).toBe(true);
    expect(enforceRateLimit(req, res, 'login')).toBe(false);
    expect(calls[0]?.code).toBe(429);
  });
});
