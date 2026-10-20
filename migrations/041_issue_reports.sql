-- เรื่องแจ้ง 4 หมวดจากเมนู Complaints (รถเข้าศูนย์ / นายบิน / การลา / ความเร็ว)
-- ฟิลด์เฉพาะของแต่ละหมวดต่างกัน (ดู src/lib/issueReportConfig.ts) จึงเก็บใน data เป็น jsonb
-- report_date คือวันที่หลักของแต่ละ record ใช้กรองตามช่วงเวลา (วัน/สัปดาห์/เดือน/ปี) ในหน้าภาพรวม
create table if not exists issue_reports (
  id uuid primary key default gen_random_uuid(),

  category text not null,
  report_date date null,

  employee_id text null,
  employee_name text null,
  position text null,

  reporter_name text null,
  reporter_phone text null,

  data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists issue_reports_category_idx on issue_reports (category);
create index if not exists issue_reports_report_date_idx on issue_reports (report_date desc);
create index if not exists issue_reports_created_at_idx on issue_reports (created_at desc);
