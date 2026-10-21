-- รองรับการแก้ไขข้อมูลคนขับแบบตั้งเวลาล่วงหน้า: ลาออก / เปลี่ยนตัว / เปลี่ยนตำแหน่ง(เปลี่ยนนาย)
-- พร้อมวันที่มีผล — ระบบจะ apply การเปลี่ยนแปลงจริงแบบ lazy (ตอน GET /api/employees)
-- และบันทึกประวัติไว้ที่ employee_status_history เพื่อให้ตรวจสอบย้อนหลังได้

alter table employees
  add column if not exists assigned_boss_name text null,
  add column if not exists pending_status text null
    check (pending_status is null or pending_status in ('active', 'inactive', 'suspended')),
  add column if not exists pending_position text null,
  add column if not exists pending_boss_name text null,
  add column if not exists pending_effective_date date null,
  add column if not exists pending_change_type text null
    check (
      pending_change_type is null
      or pending_change_type in ('resignation', 'temp_replacement', 'position_change')
    ),
  add column if not exists pending_note text null;

create index if not exists employees_pending_effective_date_idx
  on employees (pending_effective_date)
  where pending_effective_date is not null;

create table if not exists employee_status_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  change_type text not null
    check (change_type in ('resignation', 'temp_replacement', 'position_change')),
  old_status text null,
  new_status text null,
  old_position text null,
  new_position text null,
  old_boss_name text null,
  new_boss_name text null,
  effective_date date not null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists employee_status_history_employee_idx
  on employee_status_history (employee_id, created_at desc);
