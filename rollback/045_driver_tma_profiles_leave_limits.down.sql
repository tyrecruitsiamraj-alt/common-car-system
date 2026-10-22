-- Rollback สำหรับ migrations/045_driver_tma_profiles_leave_limits.sql
-- ลบคอลัมน์วันลา 3 คอลัมน์ที่เพิ่มเข้าไป — ไม่กระทบคอลัมน์อื่นของ driver_tma_profiles
--
-- วิธีใช้:
--   psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/045_driver_tma_profiles_leave_limits.down.sql

begin;

alter table driver_tma_profiles
  drop column if exists sick_leave_limit,
  drop column if exists private_leave_limit,
  drop column if exists annual_leave_limit;

delete from public._jarvis_migrations where name = '045_driver_tma_profiles_leave_limits.sql';

commit;
