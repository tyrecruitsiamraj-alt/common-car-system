// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { signAuthToken, verifyAuthToken, getJwtSecret } from '../../api/_lib/auth';

describe('auth JWT', () => {
  beforeEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.AUTH_JWT_NO_DERIVED_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.PRISMA_DATABASE_URL;
    delete process.env.POSTGRES_URL_NON_POOLING;
    delete process.env.DATABASE_URL_UNPOOLED;
    process.env.AUTH_JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
  });

  it('signs and verifies payload', () => {
    const token = signAuthToken({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      role: 'supervisor',
    });
    expect(token.length).toBeGreaterThan(20);
    const decoded = verifyAuthToken(token);
    expect(decoded.sub).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('supervisor');
  });

  it('derives secret from DATABASE_URL when AUTH_JWT_SECRET is unset', () => {
    delete process.env.AUTH_JWT_SECRET;
    process.env.DATABASE_URL = 'postgresql://u:p@host:5432/car_stamp';
    const token = signAuthToken({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      email: 'x@example.com',
      role: 'staff',
    });
    const decoded = verifyAuthToken(token);
    expect(decoded.email).toBe('x@example.com');
  });

  it('respects AUTH_JWT_NO_DERIVED_SECRET=1', () => {
    delete process.env.AUTH_JWT_SECRET;
    process.env.AUTH_JWT_NO_DERIVED_SECRET = '1';
    process.env.DATABASE_URL = 'postgresql://u:p@host:5432/car_stamp';
    expect(getJwtSecret()).toBeNull();
  });

  it('derives from POSTGRES_PRISMA_URL when primary DATABASE_URL unset', () => {
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_PRISMA_URL = 'postgresql://u:p@host:5432/from_prisma';
    const token = signAuthToken({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      email: 'p@example.com',
      role: 'staff',
    });
    expect(verifyAuthToken(token).email).toBe('p@example.com');
  });
});
