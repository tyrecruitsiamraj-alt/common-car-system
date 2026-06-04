-- เลขใบงานการจอง (เช่น BK-000001)
create sequence if not exists vehicle_bookings_work_order_seq start 1;

alter table vehicle_bookings
  add column if not exists work_order_no text null;

with numbered as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from vehicle_bookings
  where work_order_no is null or trim(work_order_no) = ''
)
update vehicle_bookings vb
set work_order_no = 'BK-' || lpad(n.rn::text, 6, '0')
from numbered n
where vb.id = n.id;

select setval(
  'vehicle_bookings_work_order_seq',
  coalesce(
    (
      select max(cast(substring(work_order_no from 4) as integer))
      from vehicle_bookings
      where work_order_no ~ '^BK-[0-9]+$'
    ),
    0
  ) + 1,
  false
);

create unique index if not exists vehicle_bookings_work_order_no_uidx
  on vehicle_bookings (work_order_no)
  where work_order_no is not null;
