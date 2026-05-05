-- Add cleansing-data fields for resigned employee details in jobs
alter table if exists jobs
  add column if not exists resigned_title_prefix text null,
  add column if not exists resigned_first_name text null,
  add column if not exists resigned_last_name text null,
  add column if not exists resigned_age int null,
  add column if not exists resigned_reason text null;

