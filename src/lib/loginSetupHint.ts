/** เมื่อ API โยน Missing database connection — อธิบายครบในครั้งเดียว (ไม่มีความลับใน string นี้) */
export const LOGIN_DATABASE_MISSING_HINT_TH = `เซิร์ฟเวอร์ยังเชื่อม PostgreSQL ไม่ได้ — ใน environment ของ API ยังไม่มี connection string (หรือชุด PGHOST+PGUSER+PGDATABASE)

สิ่งที่ต้องทำให้ครบ (ล็อกอินจริงต้องมีทั้ง JWT + DB):
1) Vercel → Project → Settings → Environment Variables → เลือก Production → ใส่ DATABASE_URL (หรือ POSTGRES_URL / NEON_DATABASE_URL / … ตามที่โฮสต์ให้) หรือใส่ PGHOST + PGUSER + PGDATABASE (+ PGPASSWORD)
2) ตั้ง AUTH_JWT_SECRET (แนะนำ) หรือให้ระบบ derive จาก URL / จาก VERCEL_PROJECT_ID (ต้องเปิด System Environment Variables บน Vercel แล้ว Redeploy)
3) จากเครื่องคุณ ชี้ DB เดียวกับ production: npm run db:migrate && npm run db:seed

ตรวจสถานะแบบรวม (ไม่ส่งความลับ): เปิด GET /api/health ในแท็บเดียวกับเว็บ (หรือ curl) จะเห็น checks.databaseConfigured / jwtSigningReady / loginLikelyWorks

รายละเอียดชื่อตัวแปร: ดูไฟล์ .env.example`;

export function loginErrorLooksLikeMissingDatabase(
  message: string | undefined,
  error: string | undefined,
): boolean {
  const c = `${message ?? ''} ${error ?? ''}`.toLowerCase();
  return c.includes('missing database connection');
}
