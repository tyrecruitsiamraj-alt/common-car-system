-- ข้อมูลเสริมของคนขับรถจากฐานข้อมูล "Database TMA.xlsx" (Toyota Motor Asia)
-- เก็บแยกเป็นตารางใหม่ ผูกกับ employees แบบ 1:1 ด้วย employee_id (จับคู่จากชื่อ-สกุลตอน import)
-- ไม่แตะ/แก้ไขคอลัมน์เดิมของ employees — เพิ่มข้อมูลใหม่เท่านั้น
create table if not exists driver_tma_profiles (
  id uuid primary key default gen_random_uuid(),

  employee_id uuid null references employees(id) on delete set null,

  -- อ้างอิงไฟล์ต้นทาง
  tma_driver_code text null,
  driver_name_eng text null,
  driver_name_th text null,

  driver_tel text null,
  line_id text null,

  site text null,
  sub_site text null,
  tma_status text null,

  start_date date null,
  end_date date null,
  resignation_reason text null,
  experience_years numeric null,

  driver_type text null,
  under_driver_co text null,
  boss_type text null,
  assigned_user_name text null,
  assigned_user_tel text null,
  apartment text null,

  car_model text null,
  car_color text null,
  car_no text null,
  car_sticker text null,
  driver_movement text null,
  car_movement text null,

  driver_picture_url text null,
  driver_license_image_url text null,

  defensive_safety_driving text null,
  tdem_card_id text null,
  card_last5 text null,

  birthdate date null,
  age numeric null,
  english_first_name text null,
  english_last_name text null,

  exam_score_2025 numeric null,
  supervisor_score_2025 numeric null,
  complain_score numeric null,
  accident_score numeric null,
  total_score numeric null,

  source_file text null default 'Database TMA.xlsx',
  imported_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists driver_tma_profiles_employee_id_key
  on driver_tma_profiles (employee_id)
  where employee_id is not null;

create index if not exists driver_tma_profiles_driver_name_th_idx
  on driver_tma_profiles (driver_name_th);

create index if not exists driver_tma_profiles_tma_driver_code_idx
  on driver_tma_profiles (tma_driver_code);
