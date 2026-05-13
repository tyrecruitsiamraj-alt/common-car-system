-- =============================================================================
-- สร้าง PostgreSQL database ชื่อ car_stamp (ชื่อ logical "Car Stamp")
-- รันครั้งเดียวด้วยบัญชีที่มีสิทธิ์ CREATEDB — เชื่อมต่อไปที่ DB `postgres` ก่อน
-- ตัวอย่าง:
--   psql "postgresql://USER:PASS@HOST:5432/postgres" -f scripts/sql/create-database-car-stamp.sql
-- บน Windows (PowerShell):
--   psql $env:DATABASE_URL_MAINTENANCE -f scripts/sql/create-database-car-stamp.sql
-- =============================================================================

CREATE DATABASE car_stamp;

-- หมายเหตุ: บน Neon / Vercel Postgres มักสร้าง database จากแดชบอร์ดได้เลย
-- จากนั้นใส่ connection string ลง Vercel → Environment Variables เป็น DATABASE_URL
