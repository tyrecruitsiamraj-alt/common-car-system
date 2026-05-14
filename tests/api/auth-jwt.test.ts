// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { signAuthToken, verifyAuthToken, getJwtSecret } from '../../api/_lib/auth';

describe('auth JWT', () => {
  beforeEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.AUTH_JWT_NO_DERIVED_SECRET;
    delete process.env.AUTH_JWT_DISABLE_VERCEL_PROJECT_FALLBACK;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.PRISMA_DATABASE_URL;
    delete process.env.POSTGRES_URL_NON_POOLING;
    delete process.env.DATABASE_URL_UNPOOLED;
    delete process.env.NEON_DATABASE_URL;
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.PGHOST;
    delete process.env.POSTGRES_HOST;
    delete process.env.PG_HOST;
    delete process.env.DB_HOST;
    delete process.env.PGUSER;
    delete process.env.POSTGRES_USER;
    delete process.env.PG_USER;
    delete process.env.DB_USER;
    delete process.env.PGPASSWORD;
    delete process.env.POSTGRES_PASSWORD;
    delete process.env.PG_PASSWORD;
    delete process.env.DB_PASSWORD;
    delete process.env.PGDATABASE;
    delete process.env.POSTGRES_DATABASE;
    delete process.env.POSTGRES_DB;
    delete process.env.PG_DATABASE;
    delete process.env.DB_NAME;
    delete process.env.DATABASE_NAME;
    delete process.env.PGPORT;
    delete process.env.POSTGRES_PORT;
    delete process.env.PG_PORT;
    delete process.env.DB_PORT;
    delete process.env.VERCEL;
    delete process.env.VERCEL_PROJECT_ID;
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

  it('derives from VERCEL_PROJECT_ID on Vercel when no DB URL', () => {
    delete process.env.AUTH_JWT_SECRET;
    process.env.VERCEL = '1';
    process.env.VERCEL_PROJECT_ID = 'prj_test_vercel_fallback_xx';
    const token = signAuthToken({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      email: 'v@example.com',
      role: 'staff',
    });
    expect(verifyAuthToken(token).email).toBe('v@example.com');
  });
});
