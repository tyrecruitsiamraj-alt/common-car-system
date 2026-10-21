-- Rollback สำหรับ migrations/039_complaints.sql
-- ⚠️ คำเตือน: คำสั่งนี้ลบตาราง complaints ทั้งตาราง รวมถึงข้อมูลที่เคยบันทึกไว้ในนั้นด้วย
-- ไม่แตะตารางอื่นของระบบ
--
-- วิธีใช้:
--   psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/039_complaints.down.sql

begin;

drop table if exists complaints;

delete from public._jarvis_migrations where name = '039_complaints.sql';

commit;
