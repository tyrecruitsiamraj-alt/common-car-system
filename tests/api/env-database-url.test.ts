// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabaseUrl, listNonEmptyDatabaseEnvKeyNames } from '../../api/_lib/env';

const KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'NEON_DATABASE_URL',
  'SUPABASE_DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'PRISMA_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'PGHOST',
  'POSTGRES_HOST',
  'PG_HOST',
  'DB_HOST',
  'PGUSER',
  'POSTGRES_USER',
  'PG_USER',
  'DB_USER',
  'PGPASSWORD',
  'POSTGRES_PASSWORD',
  'PG_PASSWORD',
  'DB_PASSWORD',
  'PGDATABASE',
  'POSTGRES_DATABASE',
  'POSTGRES_DB',
  'PG_DATABASE',
  'DB_NAME',
  'DATABASE_NAME',
  'PGPORT',
  'POSTGRES_PORT',
  'PG_PORT',
  'DB_PORT',
] as const;

describe('getDatabaseUrl', () => {
  const backup: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      const v = backup[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns NEON_DATABASE_URL when set', () => {
    process.env.NEON_DATABASE_URL = 'postgresql://n:n@neon.tech/db';
    expect(getDatabaseUrl()).toBe('postgresql://n:n@neon.tech/db');
  });

  it('builds postgresql URL from PGHOST/PGUSER/PGDATABASE', () => {
    process.env.PGHOST = 'db.example.com';
    process.env.PGUSER = 'app';
    process.env.PGPASSWORD = 'p@ss';
    process.env.PGDATABASE = 'car_stamp';
    process.env.PGPORT = '5432';
    const u = getDatabaseUrl();
    expect(u).toMatch(/^postgresql:\/\//);
    expect(u).toContain('db.example.com');
    expect(u).toContain('car_stamp');
  });

  it('builds URL from POSTGRES_HOST / POSTGRES_USER / POSTGRES_DB', () => {
    process.env.POSTGRES_HOST = 'neon.example';
    process.env.POSTGRES_USER = 'u1';
    process.env.POSTGRES_PASSWORD = 'sec';
    process.env.POSTGRES_DB = 'mydb';
    process.env.POSTGRES_PORT = '5432';
    const u = getDatabaseUrl();
    expect(u).toContain('neon.example');
    expect(u).toContain('mydb');
    expect(u).toContain('u1');
  });

  it('lists which known DB env keys are set (names only)', () => {
    process.env.POSTGRES_HOST = 'h';
    expect(listNonEmptyDatabaseEnvKeyNames()).toContain('POSTGRES_HOST');
  });
});
