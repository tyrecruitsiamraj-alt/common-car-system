-- Backfill jobs request/resigned metadata columns with explicit schema target.
-- This repairs environments where older migrations ran with a different search_path.
alter table if exists jarvis_rm.jobs
  add column if not exists request_no text null,
  add column if not exists resigned_employee_name text null,
  add column if not exists resigned_title_prefix text null,
  add column if not exists resigned_first_name text null,
  add column if not exists resigned_last_name text null,
  add column if not exists resigned_age int null,
  add column if not exists resigned_reason text null;

alter table if exists public.jobs
  add column if not exists request_no text null,
  add column if not exists resigned_employee_name text null,
  add column if not exists resigned_title_prefix text null,
  add column if not exists resigned_first_name text null,
  add column if not exists resigned_last_name text null,
  add column if not exists resigned_age int null,
  add column if not exists resigned_reason text null;

