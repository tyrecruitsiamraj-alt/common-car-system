alter table fleet_exam_submissions
  add column if not exists score_correct int null,
  add column if not exists score_total int null,
  add column if not exists score_percent int null,
  add column if not exists passed boolean null;
