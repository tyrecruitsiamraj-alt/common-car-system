-- Backfill jobs request/resigned metadata (ใช้ search_path จาก PGSCHEMA เช่น car_stamp)
-- ไม่แตะ schema jarvis_rm
ALTER TABLE IF EXISTS jobs
  ADD COLUMN IF NOT EXISTS request_no text null,
  ADD COLUMN IF NOT EXISTS resigned_employee_name text null,
  ADD COLUMN IF NOT EXISTS resigned_title_prefix text null,
  ADD COLUMN IF NOT EXISTS resigned_first_name text null,
  ADD COLUMN IF NOT EXISTS resigned_last_name text null,
  ADD COLUMN IF NOT EXISTS resigned_age int null,
  ADD COLUMN IF NOT EXISTS resigned_reason text null;
