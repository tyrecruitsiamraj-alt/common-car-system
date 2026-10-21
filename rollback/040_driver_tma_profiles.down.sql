-- Rollback สำหรับ migrations/040_driver_tma_profiles.sql
-- ⚠️ คำเตือน: คำสั่งนี้ลบตาราง driver_tma_profiles ทั้งตาราง รวมถึงข้อมูลที่เคย import ไว้ด้วย
-- FK ของตารางนี้เป็น on delete set null (ชี้ไป employees) จึงไม่กระทบ/ไม่ลบข้อมูลใน employees แน่นอน
--
-- วิธีใช้:
--   psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/040_driver_tma_profiles.down.sql

begin;

drop table if exists driver_tma_profiles;

delete from public._jarvis_migrations where name = '040_driver_tma_profiles.sql';

commit;
