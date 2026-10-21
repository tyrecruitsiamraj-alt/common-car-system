# Rollback scripts สำหรับ migrations 039–042

เตรียมไว้ล่วงหน้าก่อนรัน `npm run db:migrate` กับ production เผื่อต้องย้อนกลับ
**ไม่ได้ถูกรันหรือทดสอบกับฐานข้อมูลจริงใดๆ** — เป็นสคริปต์ที่เขียนจาก forward migration แต่ละไฟล์เท่านั้น

## ไฟล์ในนี้

- `039_complaints.down.sql` — ลบตาราง `complaints`
- `040_driver_tma_profiles.down.sql` — ลบตาราง `driver_tma_profiles`
- `041_issue_reports.down.sql` — ลบตาราง `issue_reports`
- `042_employee_pending_changes.down.sql` — ลบตาราง `employee_status_history` + ลบ 7 คอลัมน์ที่เพิ่มใน `employees`
- `rollback_all_039_to_042.sql` — รวมทั้ง 4 ไฟล์ด้านบนในไฟล์เดียว (ย้อนตามลำดับ 042→039)

## ความปลอดภัย

- ทุกไฟล์ลบ "เฉพาะสิ่งที่ migration เดิมเพิ่มเข้ามา" เท่านั้น ไม่แตะคอลัมน์/ตาราง/ข้อมูลเดิมที่มีก่อนหน้า
- `039`/`040`/`041` แต่ละไฟล์ลบตารางที่สร้างใหม่ทั้งตาราง — ถ้ามีข้อมูลถูกบันทึกเข้าไปแล้วหลัง migration รัน ข้อมูลในตารางนั้นจะหายไปด้วย (เป็นเรื่องปกติของการ rollback ตารางใหม่)
- `042` ลบแค่คอลัมน์ nullable ที่เพิ่งเพิ่ม ไม่กระทบคอลัมน์เดิมของ `employees` เลย
- ทุกไฟล์ลบ record ออกจาก `public._jarvis_migrations` ด้วย เพื่อให้ `npm run db:migrate` รู้ว่า migration นั้นยังไม่ถูก apply (รันซ้ำได้ในอนาคตถ้าต้องการ)
- ทุกไฟล์ครอบด้วย `begin;` ... `commit;` เป็น transaction เดียว

## วิธีใช้ (ตัวอย่าง)

```bash
psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/042_employee_pending_changes.down.sql
```

หรือย้อนทั้งหมดในคำสั่งเดียว:

```bash
psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/rollback_all_039_to_042.sql
```

ปรับ `car_stamp` เป็นชื่อ schema จริงถ้าใช้คนละชื่อ (ดูได้จาก `PGSCHEMA`/`DATABASE_SCHEMA` หรือจาก response ของ `/api/health` ฟิลด์ `bookingGuards.schema`)
