-- ผู้ใช้คนเดียวที่ admin มอบหมายให้แก้เวลาใบงานที่ปิดแล้ว
create table if not exists fleet_booking_permissions (
  id text primary key default 'default',
  completed_time_editor_user_id uuid null references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid null references users(id) on delete set null
);

insert into fleet_booking_permissions (id)
values ('default')
on conflict (id) do nothing;
