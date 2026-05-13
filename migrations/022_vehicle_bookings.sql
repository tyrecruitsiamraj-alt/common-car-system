-- การจอง: ผู้ขับ (employees) + รถ + ช่วงเวลา (รายชั่วโมง / ซ้อนทับได้ตรวจที่ API)
create table if not exists vehicle_bookings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_bookings_time_order check (ends_at > starts_at)
);

create index if not exists vehicle_bookings_vehicle_time_idx
  on vehicle_bookings (vehicle_id, starts_at, ends_at);

create index if not exists vehicle_bookings_employee_time_idx
  on vehicle_bookings (employee_id, starts_at, ends_at);

create index if not exists vehicle_bookings_range_idx
  on vehicle_bookings using btree (starts_at, ends_at);
