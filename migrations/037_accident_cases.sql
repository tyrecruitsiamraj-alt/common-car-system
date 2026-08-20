create table if not exists accident_cases (
  id uuid primary key default gen_random_uuid(),
  case_date date not null,
  employee_name text not null,
  driver_status text null,
  job_type text null,
  province text null,
  years_of_service text null,
  employee_age text null,
  case_status text null,
  time_range text null,
  work_day_type text null,
  vehicle_model text null,
  case_detail text null,
  accident_type text null,
  movement_detail text null,
  location_name text null,
  location_detail text null,
  root_cause text null,
  cause_detail text null,
  penalty text null,
  reporter_name text null,
  reporter_phone text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accident_cases_case_date_idx
  on accident_cases (case_date desc);
