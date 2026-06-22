-- Prevent double booking at database level (active bookings only).
-- Requires btree_gist. Validates existing data before adding constraints.

do $$
declare
  rec record;
  overlap_lines text := '';
begin
  for rec in
    select
      'vehicle'::text as kind,
      a.id::text as booking_a_id,
      b.id::text as booking_b_id,
      a.vehicle_id::text as resource_id,
      a.starts_at as a_starts,
      coalesce(a.completed_at, a.ends_at) as a_ends,
      b.starts_at as b_starts,
      coalesce(b.completed_at, b.ends_at) as b_ends
    from vehicle_bookings a
    join vehicle_bookings b
      on a.vehicle_id = b.vehicle_id
     and a.id < b.id
    where coalesce(a.status, 'active') = 'active'
      and coalesce(b.status, 'active') = 'active'
      and tstzrange(a.starts_at, coalesce(a.completed_at, a.ends_at), '[)')
          && tstzrange(b.starts_at, coalesce(b.completed_at, b.ends_at), '[)')
    union all
    select
      'employee'::text as kind,
      a.id::text as booking_a_id,
      b.id::text as booking_b_id,
      a.employee_id::text as resource_id,
      a.starts_at as a_starts,
      coalesce(a.completed_at, a.ends_at) as a_ends,
      b.starts_at as b_starts,
      coalesce(b.completed_at, b.ends_at) as b_ends
    from vehicle_bookings a
    join vehicle_bookings b
      on a.employee_id = b.employee_id
     and a.id < b.id
    where coalesce(a.status, 'active') = 'active'
      and coalesce(b.status, 'active') = 'active'
      and tstzrange(a.starts_at, coalesce(a.completed_at, a.ends_at), '[)')
          && tstzrange(b.starts_at, coalesce(b.completed_at, b.ends_at), '[)')
  loop
    overlap_lines := overlap_lines || format(
      E'\n  - %s overlap: booking %s vs %s (resource %s) [%s – %s] × [%s – %s]',
      rec.kind,
      rec.booking_a_id,
      rec.booking_b_id,
      rec.resource_id,
      rec.a_starts,
      rec.a_ends,
      rec.b_starts,
      rec.b_ends
    );
  end loop;

  if overlap_lines <> '' then
    raise exception
      'Cannot add booking overlap constraints — existing overlapping active bookings found:%',
      overlap_lines;
  end if;
end $$;

create extension if not exists btree_gist;

alter table vehicle_bookings
  drop constraint if exists vehicle_bookings_vehicle_no_overlap;

alter table vehicle_bookings
  add constraint vehicle_bookings_vehicle_no_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(starts_at, coalesce(completed_at, ends_at), '[)') with &&
  )
  where (coalesce(status, 'active') = 'active');

alter table vehicle_bookings
  drop constraint if exists vehicle_bookings_employee_no_overlap;

alter table vehicle_bookings
  add constraint vehicle_bookings_employee_no_overlap
  exclude using gist (
    employee_id with =,
    tstzrange(starts_at, coalesce(completed_at, ends_at), '[)') with &&
  )
  where (coalesce(status, 'active') = 'active');
