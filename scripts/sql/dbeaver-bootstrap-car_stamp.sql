-- =============================================================================
-- Bootstrap schema car_stamp ใน DBeaver (PostgreSQL)
-- =============================================================================
-- ตารางทั้งหมดสร้างจากโปรเจกต์ด้วย: npm run db:migrate && npm run db:seed
-- ไฟล์นี้แค่สร้าง schema ถ้ายังไม่มี
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS car_stamp;

-- จากนั้นใน .env.local:
--   DATABASE_URL=postgresql://USER:PASS@HOST:5432/car_stamp
--   PGSCHEMA=car_stamp
-- แล้วในเทอร์มินัลที่โฟลเดอร์โปรเจกต์:
--   npm run db:migrate
--   npm run db:seed
