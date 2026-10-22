-- สิทธิ์รายบุคคลแบบทั่วไป — มอบความสามารถ (capability) หนึ่งอย่างให้ผู้ใช้เฉพาะคนได้ โดยไม่ต้องอิง role
-- เช่น capability = 'delete_complaints' ให้สิทธิ์ลบข้อมูล Complaints แก่ผู้ใช้ที่ไม่ใช่ admin ได้เป็นรายคน
-- อนาคตเพิ่ม capability ใหม่ได้โดยไม่ต้อง migrate schema เพิ่ม (แค่ insert แถวใหม่)
create table if not exists user_permissions (
  user_id uuid not null references users (id) on delete cascade,
  capability text not null,
  granted_at timestamptz not null default now(),
  granted_by_user_id uuid null references users (id) on delete set null,
  primary key (user_id, capability)
);

create index if not exists user_permissions_capability_idx on user_permissions (capability);
