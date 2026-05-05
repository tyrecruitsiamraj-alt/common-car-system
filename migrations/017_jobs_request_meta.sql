-- Add request metadata fields for jobs
alter table if exists jobs
  add column if not exists request_no text null,
  add column if not exists resigned_employee_name text null;

