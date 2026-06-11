create table if not exists fleet_exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_key text not null,
  answers jsonb not null default '{}'::jsonb,
  submitter_name text null,
  vehicle_plate text null,
  user_id uuid null,
  user_email text null,
  created_at timestamptz not null default now()
);

create index if not exists fleet_exam_submissions_exam_key_idx
  on fleet_exam_submissions (exam_key, created_at desc);
