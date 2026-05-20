-- บันทึกเวลาที่ปิดงานจอง (กดเสร็จสิ้น) แยกจาก ends_at ตามแผน
alter table vehicle_bookings
  add column if not exists completed_at timestamptz null;

create index if not exists vehicle_bookings_completed_at_idx
  on vehicle_bookings (completed_at)
  where completed_at is not null;
