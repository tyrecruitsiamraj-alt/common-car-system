-- ยกเลิกแบบ soft + เก็บประวัติการแก้ไข
alter table vehicle_bookings
  add column if not exists status text not null default 'active';

update vehicle_bookings set status = 'active' where status is null or status = '';

alter table vehicle_bookings drop constraint if exists vehicle_bookings_status_check;
alter table vehicle_bookings
  add constraint vehicle_bookings_status_check check (status in ('active', 'cancelled'));

create index if not exists vehicle_bookings_status_time_idx
  on vehicle_bookings (status, starts_at, ends_at);

create table if not exists vehicle_booking_audit (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references vehicle_bookings(id) on delete cascade,
  user_id uuid null,
  user_name text not null default '',
  action text not null check (action in ('created', 'updated', 'cancelled')),
  old_value jsonb null,
  new_value jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_booking_audit_booking_idx
  on vehicle_booking_audit (booking_id, created_at desc);

create index if not exists vehicle_booking_audit_created_idx
  on vehicle_booking_audit (created_at desc);
