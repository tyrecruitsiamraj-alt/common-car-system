import { isVercelProduction } from './auth.js';

export type CorsResolution = {
  /** Request may proceed (no Origin, or Origin is on the allowlist). */
  allowed: boolean;
  /** Reflect this value in Access-Control-Allow-Origin when set. */
  reflectOrigin?: string;
};

const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

export function parseAllowedOrigins(): Set<string> {
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (raw) {
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  if (!isVercelProduction()) {
    return new Set(LOCAL_DEV_ORIGINS);
  }
  return new Set();
}

export function resolveCors(originHeader: string): CorsResolution {
  const origin = originHeader.trim();
  if (!origin) {
    return { allowed: true };
  }
  const allowed = parseAllowedOrigins();
  if (allowed.has(origin)) {
    return { allowed: true, reflectOrigin: origin };
  }
  return { allowed: false };
}

type CorsRes = {
  setHeader: (name: string, value: string | number | ReadonlyArray<string>) => void;
};

export function applyCorsHeaders(res: CorsRes, cors: CorsResolution): void {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
  if (cors.reflectOrigin) {
    res.setHeader('Access-Control-Allow-Origin', cors.reflectOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}
