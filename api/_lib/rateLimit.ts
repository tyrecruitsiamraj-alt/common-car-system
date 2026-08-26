import type { ApiReq, ApiRes } from './http.js';
import { sendError } from './http.js';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Prune expired buckets occasionally so memory stays bounded. */
function pruneExpired(now: number): void {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export function getClientIp(req: ApiReq): string {
  const headers = req.headers ?? {};
  const xff = headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',')[0]?.trim() || 'unknown';
  }
  const realIp = headers['x-real-ip'];
  const rip = Array.isArray(realIp) ? realIp[0] : realIp;
  if (typeof rip === 'string' && rip.trim()) return rip.trim();
  return 'unknown';
}

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  pruneExpired(now);
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

export type RateLimitedEndpoint =
  | 'login'
  | 'dev-role'
  | 'forgot-password'
  | 'accident-report'
  | 'complaint-report';

export function readRateLimitConfig(
  endpoint: RateLimitedEndpoint,
): { max: number; windowMs: number } {
  const defaults: Record<RateLimitedEndpoint, { max: number; windowMs: number }> = {
    login: { max: 10, windowMs: 15 * 60 * 1000 },
    'dev-role': { max: 5, windowMs: 15 * 60 * 1000 },
    'forgot-password': { max: 5, windowMs: 60 * 60 * 1000 },
    'accident-report': { max: 10, windowMs: 60 * 60 * 1000 },
    'complaint-report': { max: 10, windowMs: 60 * 60 * 1000 },
  };
  const d = defaults[endpoint];
  const envPrefix =
    endpoint === 'login'
      ? 'AUTH_RATE_LIMIT_LOGIN'
      : endpoint === 'dev-role'
        ? 'AUTH_RATE_LIMIT_DEV_ROLE'
        : endpoint === 'forgot-password'
          ? 'AUTH_RATE_LIMIT_FORGOT_PASSWORD'
          : endpoint === 'accident-report'
            ? 'AUTH_RATE_LIMIT_ACCIDENT_REPORT'
            : 'AUTH_RATE_LIMIT_COMPLAINT_REPORT';
  const maxRaw = Number(process.env[`${envPrefix}_MAX`]);
  const windowRaw = Number(process.env[`${envPrefix}_WINDOW_MS`]);
  return {
    max: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : d.max,
    windowMs: Number.isFinite(windowRaw) && windowRaw > 0 ? windowRaw : d.windowMs,
  };
}

export function enforceRateLimit(
  req: ApiReq,
  res: ApiRes,
  endpoint: RateLimitedEndpoint,
): boolean {
  const { max, windowMs } = readRateLimitConfig(endpoint);
  const ip = getClientIp(req);
  const key = `${endpoint}:${ip}`;
  if (checkRateLimit(key, max, windowMs)) return true;
  sendError(res, 429, 'Too many requests', 'Please try again later.');
  return false;
}

/** @internal test helper */
export function _resetRateLimitsForTests(): void {
  buckets.clear();
}
