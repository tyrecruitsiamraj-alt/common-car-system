-- เคสร้องเรียนพนักงานขับรถ (complaints) — คล้ายโครงสร้าง accident_cases
create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),

  complaint_date date not null,
  driver_name text not null,

  customer_account text null,
  employee_id text null,
  years_of_service text null,
  employee_age text null,
  category text null,
  complaint_type text null,
  complaint_details text null,
  position text null,
  root_cause text null,
  penalty text null,
  occurrence_count text null,
  corrective_action text null,
  employee_status text null,
  case_type text null,

  reporter_name text null,
  reporter_phone text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists complaints_complaint_date_idx on complaints (complaint_date desc);
create index if not exists complaints_created_at_idx on complaints (created_at desc);
