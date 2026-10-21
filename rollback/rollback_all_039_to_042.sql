-- Rollback รวมทั้ง 4 migration (039–042) ตามลำดับย้อนกลับ (042 → 039)
-- ⚠️ คำเตือน: ลบตาราง complaints / driver_tma_profiles / issue_reports ทั้งตาราง (รวมข้อมูลในนั้น ถ้ามี)
-- และลบคอลัมน์ pending_*/assigned_boss_name ออกจาก employees (คอลัมน์เหล่านี้เป็น nullable ที่เพิ่งเพิ่ม ไม่กระทบข้อมูลเดิมของ employees)
--
-- ใช้เฉพาะเมื่อรันทั้ง 4 migration ไปแล้วและต้องการย้อนกลับทั้งหมด
-- ถ้าต้องการย้อนแค่บางไฟล์ ให้ใช้ไฟล์เดี่ยวใน rollback/ แทน
--
-- วิธีใช้:
--   psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/rollback_all_039_to_042.sql

begin;

-- 042
drop table if exists employee_status_history;
alter table employees
  drop column if exists assigned_boss_name,
  drop column if exists pending_status,
  drop column if exists pending_position,
  drop column if exists pending_boss_name,
  drop column if exists pending_effective_date,
  drop column if exists pending_change_type,
  drop column if exists pending_note;

-- 041
drop table if exists issue_reports;

-- 040
drop table if exists driver_tma_profiles;

-- 039
drop table if exists complaints;

delete from public._jarvis_migrations
where name in (
  '042_employee_pending_changes.sql',
  '041_issue_reports.sql',
  '040_driver_tma_profiles.sql',
  '039_complaints.sql'
);

commit;
