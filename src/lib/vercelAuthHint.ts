/**
 * แสดงเมื่อ login/register ได้ HTTP 503 เพราะไม่มีคีย์ JWT (ไม่มี AUTH_JWT_SECRET/JWT_SECRET และไม่มี DATABASE_URL สำหรับ derive)
 * บน Vercel ต้องใส่ตัวแปรใน Project Settings — ไฟล์ .env บนเครื่องไม่ถูกอัปโหลดไปด้วย
 */
export const AUTH_JWT_MISSING_HINT = `ไม่สามารถล็อกอินได้ — เซิร์ฟเวอร์ยังไม่มีคีย์ลงลายเซ็น JWT

ถ้ามี DATABASE_URL (หรือ POSTGRES_URL) บน Vercel แล้ว: หลัง deploy เวอร์ชันล่าสุด ระบบจะสร้างคีย์จาก connection string โดยอัตโนมัติ — ยังแนะนำตั้ง AUTH_JWT_SECRET แยก (หมุนรหัส DB แล้ว session ไม่หลุดทันที)

ถ้ายังไม่มีทั้งคีย์และ DB URL:

สำคัญ: ไฟล์ .env / .env.local บนเครื่องคุณไม่ถูก deploy ไป Vercel ต้องใส่ตัวแปรใน Dashboard ของโปรเจกต์

ขั้นตอนบน Vercel
1) เปิด vercel.com → เลือกโปรเจกต์ (เช่น common-car-system)
2) Settings → Environment Variables
3) เพิ่ม AUTH_JWT_SECRET = สตริงสุ่มอย่างน้อย 32 ตัวอักษร (เลือกทั้ง Production และ Preview) — หรืออย่างน้อย DATABASE_URL + PGSCHEMA=car_stamp
4) เพิ่ม DATABASE_URL (PostgreSQL) และ PGSCHEMA=car_stamp ถ้า DB ใช้ schema นี้
5) Deployments → … ของรอบล่าสุด → Redeploy

สร้างค่า AUTH_JWT_SECRET ใน PowerShell (คัดลอกผลไปวาง):
[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))

รันบนเครื่อง (ไม่ใช่ Vercel): คัดลอก .env.example เป็น .env.local แล้วใส่ AUTH_JWT_SECRET + DATABASE_URL — ดูรายละเอียดใน .env.example

ปิดการ derive จาก DB (บังคับให้มี AUTH_JWT_SECRET เท่านั้น): AUTH_JWT_NO_DERIVED_SECRET=1`;

/** ต้องตรงกับ AUTH_JWT_MISSING_API_CODE ใน api/_lib/auth.ts */
export const AUTH_JWT_NOT_CONFIGURED_RESPONSE_CODE = 'AUTH_JWT_NOT_CONFIGURED';

/** true เมื่อ API บอกว่าไม่มีคีย์ JWT (ไม่ใช่ทุก HTTP 503) */
export function responseIndicatesJwtSigningUnavailable(
  status: number,
  data: Record<string, unknown>,
): boolean {
  if (status !== 503) return false;
  if (data.code === AUTH_JWT_NOT_CONFIGURED_RESPONSE_CODE) return true;
  const parts: string[] = [];
  for (const v of Object.values(data)) {
    if (typeof v === 'string') parts.push(v);
  }
  const b = parts.join(' ').toLowerCase();
  return (
    b.includes('auth_jwt_secret is not configured') ||
    (b.includes('auth_jwt_secret') && b.includes('not configured'))
  );
}
