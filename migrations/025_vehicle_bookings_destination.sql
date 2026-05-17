-- สถานที่ที่ไป (ปลายทางการใช้รถ)
alter table vehicle_bookings
  add column if not exists destination text null;
