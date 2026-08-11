alter table vehicle_bookings
  add column if not exists cancel_reason text null;
