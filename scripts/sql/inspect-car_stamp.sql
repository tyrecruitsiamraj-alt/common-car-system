-- รันใน DBeaver บน database เดียวกับ DATABASE_URL
-- ดูว่ามีตารางใน schema car_stamp หรือไม่

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'car_stamp'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ถ้าได้ 0 แถว แต่ public มี vehicles → อาจเคย migrate ไป public
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'vehicles'
) AS public_has_vehicles;

SELECT count(*)::int AS migration_rows_recorded
FROM public._jarvis_migrations;
