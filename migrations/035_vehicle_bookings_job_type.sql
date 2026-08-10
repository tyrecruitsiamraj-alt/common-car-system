alter table vehicle_bookings
  add column if not exists job_type text null;
