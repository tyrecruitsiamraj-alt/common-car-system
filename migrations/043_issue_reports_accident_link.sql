-- เพิ่มการตรวจสอบว่าเคส complaint (issue_reports) เกี่ยวข้องกับอุบัติเหตุหรือไม่
-- related_accident = flag ง่ายๆ ไว้กรอง/แสดงผล, accident_case_id = ลิงก์ไปเคสจริงใน accident_cases (ถ้ามี)
alter table issue_reports
  add column if not exists related_accident boolean not null default false,
  add column if not exists accident_case_id uuid null references accident_cases (id) on delete set null;

create index if not exists issue_reports_accident_case_idx
  on issue_reports (accident_case_id)
  where accident_case_id is not null;
