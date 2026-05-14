import {
  getDatabaseUrl,
  DATABASE_CONNECTION_ENV_HINT,
  listNonEmptyDatabaseEnvKeyNames,
  canComposeDatabaseUrlParts,
} from '../_lib/env.js';
import { getJwtSecret } from '../_lib/auth.js';
import { dbPing } from '../_lib/postgres.js';
import { logError } from '../_lib/logger.js';
import type { ApiReq, ApiRes } from '../_lib/http.js';

/**
 * สุขภาพ API + สิ่งที่ต้องมีสำหรับ login จริง (ไม่ส่งความลับ / ไม่ส่ง connection string)
 * GET /api/health — ใช้ตรวจบน Vercel ว่าขาดอะไรแทนการเดาทีละ error
 */
export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const databaseConfigured = !!getDatabaseUrl();
  const jwtSigningReady = !!getJwtSecret();
  const databaseRelatedEnvKeysSet = listNonEmptyDatabaseEnvKeyNames();
  const splitHostUserDbLooksComplete = canComposeDatabaseUrlParts();

  let databaseReachable: boolean | null = null;
  let databaseError: string | undefined;

  if (databaseConfigured) {
    try {
      databaseReachable = await dbPing();
      if (!databaseReachable) {
        databaseError = 'DB ping returned unexpected result';
      }
    } catch (e: unknown) {
      databaseReachable = false;
      databaseError = e instanceof Error ? e.message : String(e);
      logError('health.db_unreachable', { message: databaseError });
    }
  }

  const loginLikelyWorks =
    jwtSigningReady && databaseConfigured && databaseReachable === true;

  const hintsTh: string[] = [];
  if (!jwtSigningReady) {
    hintsTh.push(
      'JWT: ตั้ง AUTH_JWT_SECRET (แนะนำ) หรือให้มี connection string ต่อ Postgres (ระบบ derive คีย์ได้) หรือบน Vercel เปิด System Environment Variables เพื่อให้มี VERCEL_PROJECT_ID',
    );
  }
  if (!databaseConfigured) {
    hintsTh.push(
      `ฐานข้อมูล: ยังไม่มี connection string ใน environment — ${DATABASE_CONNECTION_ENV_HINT}`,
    );
    hintsTh.push(
      'ถ้าคุณใส่ host/user แล้ว: ชื่อตัวแปรบน Vercel ต้องเป็น PGHOST, PGUSER, PGDATABASE (หรือ POSTGRES_HOST, POSTGRES_USER, POSTGRES_DB) — ตัวพิมพ์ใหญ่-เล็กต้องตรง และต้องติ๊ก Environment = Production แล้ว Redeploy',
    );
    hintsTh.push(
      'สำคัญ: แก้ไฟล์ .env.example ใน Git ไม่ทำให้ Vercel ได้ค่า — ต้องใส่ใน Vercel Dashboard หรือรัน vercel env pull ลง .env.local บนเครื่องเท่านั้น',
    );
    if (databaseRelatedEnvKeysSet.length > 0 && !splitHostUserDbLooksComplete) {
      hintsTh.push(
        `ตอนนี้มีตัวแปรที่รู้จักบางตัวแล้ว (${databaseRelatedEnvKeysSet.join(', ')}) แต่ยังประกอบ URL ไม่ครบ — ต้องมีอย่างน้อย host + user + database ครบทุกกลุ่ม`,
      );
    }
    if (databaseRelatedEnvKeysSet.length === 0) {
      hintsTh.push(
        'ตอนนี้ไม่มีตัวแปร DB ใดในรายการที่ API อ่าน — ตรวจว่าใส่ในโปรเจกต์ Vercel ที่ deploy จริง และชื่อ Key ตรงกับรายการ (ดู field databaseRelatedEnvKeysSet ใน JSON นี้)',
      );
    }
  } else if (databaseReachable === false) {
    hintsTh.push(
      'ฐานข้อมูล: มีค่า connection แล้วแต่เชื่อมไม่ได้ — ตรวจ PG_SSL=true, รหัสผ่านใน URL (encode อักขระพิเศษ), และว่าโฮสต์ยอมรับ connection จาก Vercel',
    );
  }
  if (process.env.VERCEL === '1') {
    hintsTh.push(
      'Vercel: Project → Settings → Environment Variables (เลือก Production) → ใส่ค่า → Deployments → Redeploy',
    );
  }
  if (loginLikelyWorks) {
    hintsTh.push(
      'จากการตรวจเบื้องต้น: JWT + DB พร้อม — ถ้ายังล็อกอินไม่ได้ ให้ตรวจว่ามี user ใน DB (npm run db:seed) และอีเมล/รหัสถูกต้อง',
    );
  }

  const body = {
    ok: true,
    message: 'API route is up',
    vercel: {
      isVercel: process.env.VERCEL === '1',
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    checks: {
      databaseConfigured,
      jwtSigningReady,
      databaseReachable,
      loginLikelyWorks,
    },
    hintsTh,
    /** ชื่อตัวแปรที่มีค่า (ไม่ส่งค่า) — ถ้าว่างแปลว่า Vercel/API ไม่เห็นคีย์ที่รองรับ */
    databaseRelatedEnvKeysSet,
    splitHostUserDbLooksComplete,
    explainTh:
      'แก้ .env.example ใน repo ไม่เปลี่ยนค่าบน Vercel — ต้องใส่ Environment Variables ใน Dashboard แล้ว Redeploy; บนเครื่องใช้ .env.local หรือ npm run vercel:env:pull',
    /** ข้อความเดียวกับตอน Postgres ไม่มี URL — อ้างอิงเดียวกับ api/_lib/env.ts */
    connectionEnvHelp: databaseConfigured ? undefined : DATABASE_CONNECTION_ENV_HINT,
    databaseError: databaseReachable === false ? databaseError : undefined,
  };

  if (databaseConfigured && databaseReachable === false) {
    res.status(503).json({ ...body, ok: false, message: 'Database not reachable' });
    return;
  }

  res.status(200).json(body);
}
