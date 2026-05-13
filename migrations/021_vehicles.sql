-- รถในระบบจอง
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  plate_no text not null,
  label text not null default '',
  seats smallint not null default 5 check (seats >= 1 and seats <= 50),
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vehicles_plate_no_lower_unique
  on vehicles (lower(trim(plate_no)));

create index if not exists vehicles_active_idx on vehicles (is_active) where is_active = true;
