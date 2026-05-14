import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDatabaseUrl } from './env.js';

/** Matches frontend `UserRole` in src/types */
export type UserRole = 'admin' | 'supervisor' | 'staff';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'jarvis_auth';

/** ส่งใน JSON เมื่อ login ไม่ได้เพราะไม่มีคีย์ลายเซ็น — ฝั่ง client ใช้แทนการเดาจากข้อความ */
export const AUTH_JWT_MISSING_API_CODE = 'AUTH_JWT_NOT_CONFIGURED' as const;

export const AUTH_JWT_MISSING_API_MESSAGE =
  'JWT signing unavailable: set AUTH_JWT_SECRET (or JWT_SECRET), a Postgres URL (DATABASE_URL, NEON_DATABASE_URL, …), PGHOST+PGUSER+PGDATABASE, or on Vercel enable System Environment Variables so VERCEL_PROJECT_ID is available.';

/** Stable salt so derived secrets never collide with arbitrary env strings */
const JWT_DERIVE_SALT = 'car-stamp:jwt-from-database-url:v1';

/** Stable salt — อ่อนกว่า AUTH_JWT_SECRET โดยเฉพาะ ใช้เฉพาะเมื่อไม่มี DB URL บน Vercel */
const JWT_VERCEL_PROJECT_SALT = 'car-stamp:jwt-from-vercel-project-id:v1';

/** HS256 secret from DB URL when AUTH_JWT_SECRET is unset (e.g. Vercel only has DATABASE_URL). */
function deriveJwtSecretFromDbUrl(dbUrl: string): string {
  return createHash('sha256')
    .update(JWT_DERIVE_SALT, 'utf8')
    .update('\0')
    .update(dbUrl, 'utf8')
    .digest('base64url');
}

function deriveJwtSecretFromVercelProjectId(projectId: string): string {
  return createHash('sha256')
    .update(JWT_VERCEL_PROJECT_SALT, 'utf8')
    .update('\0')
    .update(projectId, 'utf8')
    .digest('base64url');
}

export function getJwtSecret(): string | null {
  const explicit = (process.env.AUTH_JWT_SECRET || '').trim();
  if (explicit) return explicit;

  const legacy = (process.env.JWT_SECRET || '').trim();
  if (legacy) return legacy;

  if ((process.env.AUTH_JWT_NO_DERIVED_SECRET || '').trim() === '1') return null;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const derived = deriveJwtSecretFromDbUrl(dbUrl);
    return derived.length >= 32 ? derived : null;
  }

  /** บน Vercel ถ้าไม่มี connection string เลย แต่มี VERCEL_PROJECT_ID (ต้องเปิด System Environment Variables) */
  if (
    process.env.VERCEL === '1' &&
    (process.env.AUTH_JWT_DISABLE_VERCEL_PROJECT_FALLBACK || '').trim() !== '1'
  ) {
    const pid = (process.env.VERCEL_PROJECT_ID || '').trim();
    if (pid) return deriveJwtSecretFromVercelProjectId(pid);
  }

  return null;
}

export function isProductionLike(): boolean {
  // ใช้เฉพาะ Vercel production (หรือบังคับผ่าน env) เพื่อหลีกเลี่ยงเคส local/preview ที่ตั้ง NODE_ENV=production
  // แล้ว cookie ถูกทำเครื่องหมาย `Secure` ทำให้เบราว์เซอร์ไม่ส่ง cookie กลับไปบน http
  return process.env.VERCEL_ENV === 'production' || process.env.AUTH_COOKIE_SECURE === 'true';
}

export type JwtUserPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export function signAuthToken(payload: JwtUserPayload, expiresInSeconds?: number): string {
  const secret = getJwtSecret();
  if (!secret) throw new Error('AUTH_JWT_SECRET is not configured');
  const ttl =
    expiresInSeconds ??
    (() => {
      const n = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 1800);
      return Number.isFinite(n) && n > 0 ? n : 1800;
    })();
  return jwt.sign(payload, secret, { expiresIn: ttl, algorithm: 'HS256' });
}

export function verifyAuthToken(token: string): JwtUserPayload {
  const secret = getJwtSecret();
  if (!secret) throw new Error('AUTH_JWT_SECRET is not configured');
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }
  const o = decoded as Record<string, unknown>;
  const sub = typeof o.sub === 'string' ? o.sub : '';
  const email = typeof o.email === 'string' ? o.email : '';
  const role = o.role;
  if (!sub || !email) throw new Error('Invalid token claims');
  if (role !== 'admin' && role !== 'supervisor' && role !== 'staff') {
    throw new Error('Invalid role in token');
  }
  return { sub, email, role };
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function getTokenFromReq(req: { headers?: Record<string, string | string[] | undefined> }): string | null {
  const raw = req.headers?.cookie;
  const cookieHeader = Array.isArray(raw) ? raw.join('; ') : raw;
  const cookies = parseCookies(cookieHeader);
  const t = cookies[AUTH_COOKIE_NAME];
  return t && t.trim() ? t.trim() : null;
}

export function getTokenFromAuthHeader(
  req: { headers?: Record<string, string | string[] | undefined> },
): string | null {
  const raw = req.headers?.authorization;
  const authHeader = Array.isArray(raw) ? raw[0] : raw;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1]?.trim();
  return token || null;
}

export function buildSetCookieHeader(token: string, maxAgeSeconds: number): string {
  const secure = isProductionLike() ? 'Secure; ' : '';
  const sameSite = process.env.AUTH_COOKIE_SAMESITE === 'strict' ? 'Strict' : 'Lax';
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${secure}SameSite=${sameSite}; Max-Age=${maxAgeSeconds}`;
}

export function buildClearCookieHeader(): string {
  const secure = isProductionLike() ? 'Secure; ' : '';
  const sameSite = process.env.AUTH_COOKIE_SAMESITE === 'strict' ? 'Strict' : 'Lax';
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; ${secure}SameSite=${sameSite}; Max-Age=0`;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
