-- Rollback สำหรับ migrations/041_issue_reports.sql
-- ⚠️ คำเตือน: คำสั่งนี้ลบตาราง issue_reports ทั้งตาราง รวมถึงข้อมูลที่เคยบันทึกไว้ในนั้นด้วย
-- ใช้เฉพาะถ้าต้องการย้อนกลับหลังรัน 041 ไปแล้วและพบปัญหา ไม่แตะตารางอื่นของระบบ (employees, vehicles ฯลฯ)
--
-- วิธีใช้:
--   psql "$DATABASE_URL" -c "SET search_path TO car_stamp, public;" -f rollback/041_issue_reports.down.sql

begin;

drop table if exists issue_reports;

delete from public._jarvis_migrations where name = '041_issue_reports.sql';

commit;
