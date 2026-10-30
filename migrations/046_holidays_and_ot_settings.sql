-- ปฏิทินวันหยุด (ราชการ/บริษัท) — ใช้แยกวันทำงานปกติ (OT1.5x) กับวันหยุด (OT3x) ตอนคำนวณชั่วโมงทำงาน
create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  name text not null,
  holiday_type text not null default 'official' check (holiday_type in ('official', 'company')),
  created_at timestamptz not null default now()
);

create unique index if not exists holidays_date_unique on holidays (holiday_date);

-- ตั้งค่าเรท OT และเกณฑ์ชั่วโมงทำงาน — แถวเดียวตายตัว (id ต้องเป็น true) แก้ไขได้จากหน้า Settings
create table if not exists ot_settings (
  id boolean primary key default true check (id),
  ot_rate_1_5x numeric not null default 50,
  ot_rate_3x numeric not null default 100,
  full_time_threshold_hours numeric not null default 8,
  supervisor_ot_alert_hours numeric not null default 50,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid null references users (id) on delete set null
);

insert into ot_settings (id) values (true) on conflict (id) do nothing;

-- วันหยุดราชการไทยที่กำหนดวันที่แน่นอนทุกปี (ไม่รวมวันหยุดตามจันทรคติ/วันหยุดชดเชย ซึ่งประกาศเป็นปีๆ ไป — เพิ่มเองได้ที่หน้า Settings)
insert into holidays (holiday_date, name, holiday_type) values
  ('2026-01-01', 'วันขึ้นปีใหม่', 'official'),
  ('2026-04-13', 'วันสงกรานต์', 'official'),
  ('2026-04-14', 'วันสงกรานต์', 'official'),
  ('2026-04-15', 'วันสงกรานต์', 'official'),
  ('2026-05-01', 'วันแรงงานแห่งชาติ', 'official'),
  ('2026-05-04', 'วันฉัตรมงคล', 'official'),
  ('2026-07-28', 'วันเฉลิมพระชนมพรรษา ร.10', 'official'),
  ('2026-08-12', 'วันแม่แห่งชาติ', 'official'),
  ('2026-10-13', 'วันคล้ายวันสวรรคต ร.9', 'official'),
  ('2026-10-23', 'วันปิยมหาราช', 'official'),
  ('2026-12-05', 'วันพ่อแห่งชาติ', 'official'),
  ('2026-12-10', 'วันรัฐธรรมนูญ', 'official'),
  ('2026-12-31', 'วันสิ้นปี', 'official')
on conflict (holiday_date) do nothing;
