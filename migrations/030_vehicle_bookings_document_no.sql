alter table vehicle_bookings
  add column if not exists document_no text null;

create index if not exists vehicle_bookings_document_no_idx
  on vehicle_bookings (document_no)
  where document_no is not null;
