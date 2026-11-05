# Common Car System

ระบบจัดการรถและคนขับ: React (Vite) SPA + API แบบ serverless บน Vercel + PostgreSQL (schema `car_stamp`)

**เริ่มงานทุกครั้ง:** อ่าน [Progress.md](Progress.md) ก่อน และอัปเดตไฟล์นั้นก่อนจบงานหรือก่อนสลับบัญชี

## กฎความปลอดภัย

- **repo นี้เป็นสาธารณะ** ทุกอย่างที่ push คนนอกอ่านได้ทันที รวมถึงไฟล์นี้และ Progress.md
  - ห้าม commit: secret, ค่าใน `.env*`, host ของฐานข้อมูล, ข้อมูลบุคคล, ชื่อพนักงานจริง, รายละเอียดช่องโหว่ที่ยังไม่แก้
  - รายงาน QA และ `docs/qa/` เก็บนอก git ห้าม `git add` โดยไม่ดูก่อน
- **`.env.local` ชี้ไปฐานข้อมูลจริง** และไฟล์นี้มีผลกับ test และสคริปต์ `db:*`
  - ห้ามรัน `db:migrate`, `db:seed`, `db:seed:*`, `db:import:*`, `db:sync:*` โดยไม่ได้รับการยืนยันก่อน
  - รัน test ด้วยคำสั่งในหัวข้อคำสั่งเท่านั้น เพื่อไม่ให้ต่อฐานจริง
- **การแก้ข้อมูลบนฐานจริง** ต้องทำตามลำดับ: preview แบบ read-only → สำรองแถวที่จะแก้ → ให้เจ้าของระบบยืนยันรายการ → ทำใน transaction โดยอ้าง ID และตรวจจำนวนแถว → ตรวจผลซ้ำ

## กฎการทำงาน

- สื่อสารเป็นภาษาไทย ส่วนโค้ดและชื่อคำสั่งใช้ภาษาอังกฤษ
- ถามก่อนแก้โค้ดหรือเขียนไฟล์ทุกครั้ง แม้เป็นงานเล็ก ส่วนการอ่านและวิเคราะห์ทำได้เลย
- Commit เมื่อได้รับคำสั่ง แล้ว push ไป `origin main` ทันที
- Push เข้า `main` จะ deploy ผ่าน Vercel อัตโนมัติ ห้ามรัน `vercel deploy` เอง
- Remote `personal` เป็น backup ส่วนตัว push เฉพาะเมื่อถูกสั่ง
- ห้าม force push, rebase ประวัติที่แชร์แล้ว หรือลบ branch โดยไม่ได้รับคำสั่ง
- บอกผลการทดสอบตามจริง ถ้ายังไม่ได้ตรวจอะไรให้บอกด้วย

## ข้อตกลงของ UI

- **Export Excel:** แต่ละหน้าออกเป็นไฟล์ของตัวเอง ถ้าข้อมูลแยกประเภท ให้แยกชีตในไฟล์นั้น ใช้ `src/lib/exportExcel.ts` และดูตัวอย่างจาก `src/lib/complaintsExcelExport.ts`
- **กราฟแนวโน้มบน Dashboard:** ใช้รูปแบบเดียวกับ Accidents คือมีปุ่มสลับ line/bar, ป้ายค่าทุกจุด และ badge เน้นค่าสูงสุด

## คำสั่ง

```bash
npm run dev          # API + Vite (Vite อยู่ที่ http://localhost:8080)
npm run typecheck
npm run lint
npm run build

# test: กันไม่ให้ต่อฐานตาม .env.local
JARVIS_SKIP_LOCAL_ENV=1 DATABASE_URL='postgresql://verify:verify@127.0.0.1:1/verify' npx vitest run
```

`npm run vercel:check` รัน test, typecheck, lint และ build ต่อกัน ถ้าใช้คำสั่งนี้ต้องตั้ง `JARVIS_SKIP_LOCAL_ENV=1` ด้วย

## โครงสร้าง

| ตำแหน่ง | หน้าที่ |
|---|---|
| `src/` | หน้าเว็บ React |
| `api/[[...path]].ts` | จุดเข้า API ทั้งหมด |
| `api/_handlers/registry.ts` | ตาราง route ถ้า handler ไม่อยู่ที่นี่จะเรียกไม่ได้ |
| `api/_handlers/` | Logic ของแต่ละ endpoint |
| `api/_lib/` | Auth, rate limit, วันที่, การต่อฐานข้อมูล |
| `server/local-api.ts` | API สำหรับรันในเครื่อง |
| `migrations/` | SQL รันตามลำดับชื่อไฟล์ และจำจากชื่อไฟล์ใน `public._jarvis_migrations` |
| `scripts/` | สคริปต์ฐานข้อมูลและนำเข้าข้อมูล |
| `tests/api/` | Test ของ API |

## ข้อควรรู้ของโค้ด

- ตารางอยู่ใน schema `car_stamp` ตามค่า `PGSCHEMA`
- คอลัมน์วันที่ให้ใช้ `api/_lib/dates.ts` เพื่อไม่ให้วันที่เลื่อนตาม timezone
- `accident_cases` และ `complaints` เก็บชื่อพนักงานเป็นข้อความ ไม่มี FK ลบพนักงานแล้วแถวเหล่านี้ไม่หายตาม
- การลบพนักงานจะ cascade ไป `vehicle_bookings`, `work_calendar`, `training_records` และ `employee_status_history`
- `README.md` บางส่วนไม่ตรงกับโค้ด เมื่อขัดกันให้ยึดโค้ด
