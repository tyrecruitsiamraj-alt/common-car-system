/**
 * แสดงเมื่อ login/register ได้ HTTP 503 เพราะ API ยังไม่มี AUTH_JWT_SECRET
 * (บน Vercel ต้องใส่ใน Project Settings — ไฟล์ .env บนเครื่องไม่ถูกอัปโหลดไปด้วย)
 */
export const AUTH_JWT_MISSING_HINT = `ไม่สามารถล็อกอินได้ — เซิร์ฟเวอร์ยังไม่มี AUTH_JWT_SECRET

สำคัญ: ไฟล์ .env / .env.local บนเครื่องคุณไม่ถูก deploy ไป Vercel ต้องใส่ตัวแปรใน Dashboard ของโปรเจกต์

ขั้นตอนบน Vercel
1) เปิด vercel.com → เลือกโปรเจกต์ (เช่น common-car-system)
2) Settings → Environment Variables
3) เพิ่ม AUTH_JWT_SECRET = สตริงสุ่มอย่างน้อย 32 ตัวอักษร (เลือกทั้ง Production และ Preview)
4) เพิ่ม DATABASE_URL (PostgreSQL) และ PGSCHEMA=car_stamp ถ้า DB ใช้ schema นี้
5) Deployments → … ของรอบล่าสุด → Redeploy

สร้างค่า AUTH_JWT_SECRET ใน PowerShell (คัดลอกผลไปวาง):
[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))

รันบนเครื่อง (ไม่ใช่ Vercel): คัดลอก .env.example เป็น .env.local แล้วใส่ AUTH_JWT_SECRET + DATABASE_URL — ดูรายละเอียดใน .env.example`;
