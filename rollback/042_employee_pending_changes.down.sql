-- Rollback สำหรับ migrations/042_employee_pending_changes.sql
-- ใช้เฉพาะถ้าต้องการย้อนกลับหลังรัน 042 ไปแล้วและพบปัญหา
-- ปลอดภัย: ลบเฉพาะคอลัมน์/ตารางที่ 042 เพิ่มเข้ามาเท่านั้น ไม่แตะคอลัมน์/ข้อมูลเดิมของ employees
--
-- วิธีใช้: ตรวจสอบว่าต่อ schema ถูกต้องก่อน (SET search_path TO car_stamp, public;)
-- แล้วรันไฟล์นี้ทั้งไฟล์ภายใน transaction เดียว เช่น:
--   psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/042_employee_pending_changes.down.sql

begin;

drop table if exists employee_status_history;

alter table employees
  drop column if exists assigned_boss_name,
  drop column if exists pending_status,
  drop column if exists pending_position,
  drop column if exists pending_boss_name,
  drop column if exists pending_effective_date,
  drop column if exists pending_change_type,
  drop column if exists pending_note;

-- ลบประวัติว่า migration นี้ถูก apply แล้ว เพื่อให้ `npm run db:migrate` รันไฟล์ 042 ใหม่ได้อีกครั้งในอนาคตถ้าต้องการ
delete from public._jarvis_migrations where name = '042_employee_pending_changes.sql';

commit;
