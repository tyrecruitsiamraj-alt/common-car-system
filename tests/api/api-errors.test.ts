// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { handleApiError } from '../../api/_lib/http';
import { parseCookies } from '../../api/_lib/auth';

function send(e: unknown) {
  const out = { status: 0, body: null as unknown };
  const res = {
    status(code: number) {
      out.status = code;
      return {
        json: (b: unknown) => {
          out.body = b;
        },
      };
    },
  };
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  handleApiError(res as never, e, 'test');
  return out;
}

const pgError = (code: string, message = 'secret sql detail') => Object.assign(new Error(message), { code });

describe('handleApiError', () => {
  it.each([
    ['22P02', 400],
    ['22001', 400],
    ['22003', 400],
    ['22007', 400],
    ['23502', 400],
    ['23514', 400],
    ['23505', 409],
    ['23P01', 409],
    ['23503', 409],
  ])('maps Postgres %s to %i without leaking SQL text', (code, status) => {
    const out = send(pgError(code));
    expect(out.status).toBe(status);
    expect(JSON.stringify(out.body)).not.toContain('secret sql detail');
  });

  it('maps malformed JSON to 400', () => {
    let err: unknown;
    try {
      JSON.parse('{bad');
    } catch (e) {
      err = e;
    }
    expect(send(err).status).toBe(400);
  });

  it('keeps real server faults as 500', () => {
    expect(send(new Error('boom')).status).toBe(500);
    expect(send(pgError('22012')).status).toBe(500);
    expect(send(pgError('08006')).status).toBe(500);
  });
});

describe('parseCookies', () => {
  it('skips a malformed value and keeps the others', () => {
    expect(parseCookies('bad=%E0%A4%A; good=1')).toEqual({ good: '1' });
  });
});
