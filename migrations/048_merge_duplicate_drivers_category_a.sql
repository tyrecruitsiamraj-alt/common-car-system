-- รวมคนขับที่ชื่อซ้ำกันหมวด A: รหัสเก่า EMP-xxx กับรหัสใหม่ SR/TD ใหม่ เป็นคนเดียวกัน
-- (สาเหตุ: ย้ายระบบรหัสจากการ import TDEM master file ทับคำนำหน้า) — 40 กลุ่ม (คู่ 39 + กลุ่ม 3 รหัส 1)
-- อ้างอิงผลตรวจสอบ "รายงานตรวจสอบรายชื่อผู้ขับซ้ำ (Drivers)" — หมวด A เท่านั้น ไม่รวมหมวด B/D/E
--
-- Logic: ย้ายประวัติทั้งหมด (booking, work_calendar, training, TMA profile, status history,
-- สถิติสะสม, วันเริ่มงาน) จากรหัสที่ถูกรวม (retired) ไปไว้ที่รหัสที่ยังใช้งาน (kept) ให้ครบ
-- ไม่ขาดตก แล้วปิดใช้งานรหัสที่ถูกรวม (ไม่ลบ) พร้อมบันทึกว่าใครถูกรวมไปที่ใคร เพื่อให้ตรวจสอบ
-- ย้อนหลังได้ (OT / ประวัติการทำงาน / อายุงาน / เคสที่เคยเกิดขึ้น)
--
-- รหัสที่ "kept" ในตารางด้านล่างอิงจากกิจกรรมล่าสุด/มากที่สุดของแต่ละกลุ่ม ไม่ใช่เลือกตาม
-- รูปแบบรหัสเสมอไป (มี 2 กลุ่มที่ EMP เดิมถูกใช้งานต่อเนื่องมากกว่า SR/TD ใหม่ จึงเก็บ EMP ไว้แทน)

-- 1) คอลัมน์ audit สำหรับรหัสที่ถูกรวม (ไม่ลบแถว แค่ปิดใช้งาน + ชี้ไปยังรหัสที่เก็บไว้)
alter table employees
  add column if not exists merged_into_employee_id uuid null references employees (id),
  add column if not exists merged_at timestamptz null;

create index if not exists employees_merged_into_idx
  on employees (merged_into_employee_id)
  where merged_into_employee_id is not null;

-- 2) ตาราง mapping ของรอบนี้: retired_code (ปิดใช้งาน) -> keep_code (ใช้ต่อ)
create temporary table _driver_merge_map (
  retired_code text primary key,
  keep_code text not null
) on commit drop;

-- หมายเหตุ: ตัดคู่ 'เมฆา โกษารักษ์' (EMP-003 / SR 0383) ออกจากรอบนี้ — ทั้งสองรหัสมี vehicle_bookings
-- ที่ status=active ช่วงเวลาทับกันจริง (EMP-003: 2026-07-31 22:00–2026-08-01 15:00 UTC,
-- SR 0383: 2026-08-01 01:00–10:00 UTC ซึ่งอยู่ในช่วงแรกพอดี) การรวมจะชน exclusion constraint
-- vehicle_bookings_employee_no_overlap ต้องให้คนตรวจสอบก่อนว่าจองซ้อนจริงหรือเป็นข้อมูลผิดพลาด
-- แล้วค่อยรวมคู่นี้แยกต่างหาก
insert into _driver_merge_map (retired_code, keep_code) values
  ('EMP-002', 'SR 0589'),
  ('EMP-004', 'SR 0879'),
  ('EMP-005', 'SR 1054'),
  ('EMP-006', 'SR 0016'),
  ('EMP-007', 'SR 0174'),
  ('EMP-008', 'SR 0408'),
  ('EMP-009', 'SR 0410'),
  ('EMP-010', 'SR 0605'),
  ('EMP-011', 'SR 0726'),
  ('EMP-013', 'SR 0869'),
  ('EMP-014', 'SR 0874'),
  ('EMP-015', 'SR 0923'),
  ('EMP-016', 'SR 0991'),
  ('EMP-048', 'SR 0991'),
  ('EMP-017', 'SR 1006'),
  ('EMP-018', 'SR 1007'),
  ('EMP-019', 'SR 1046'),
  ('EMP-020', 'SR 1047'),
  ('EMP-021', 'SR 1062'),
  ('EMP-022', 'SR 1063'),
  ('EMP-024', 'SR 1093'),
  ('EMP-025', 'SR 1096'),
  ('EMP-026', 'SR 1097'),
  ('EMP-027', 'SR 1099'),
  ('EMP-028', 'SR 1100'),
  ('EMP-030', 'SR 1135'),
  ('EMP-031', 'SR 1129'),
  ('EMP-032', 'SR 1123'),
  ('EMP-033', 'SR 1119'),
  ('EMP-034', 'SR 1115'),
  ('EMP-035', 'SR 1116'),
  ('TD 0101', 'EMP-036'),
  ('EMP-037', 'SR 1131'),
  ('EMP-039', 'SR 1132'),
  ('EMP-040', 'SR 1144'),
  ('EMP-041', 'SR 1126'),
  ('EMP-042', 'SR 1106'),
  ('SR 1134', 'EMP-043'),
  ('EMP-044', 'SR 1077'),
  ('EMP-047', 'SR 1103');

-- กันรันผิด: ถ้ารหัสไหนใน mapping หาไม่เจอในตาราง employees (ถูกแก้ไข/ลบไปก่อนรัน migration นี้)
-- ให้ migration ทั้งไฟล์ fail และ rollback ทันที แทนที่จะรวมแบบขาดๆ หายๆ
-- (หารด้วย count(*) ที่คำนวณจากข้อมูลจริง แทน literal 0 ตรงๆ เพราะ "select 1/0" เป็นค่าคงที่
--  ที่ planner ของ Postgres จะพับ/ตรวจตอน plan เลยโดยไม่สนว่า subquery มีแถวหรือไม่)
select 1 / (case when count(*) = 0 then 1 else 0 end) from (
  select m.retired_code
  from _driver_merge_map m
  where not exists (select 1 from employees e where e.employee_code = m.retired_code)
     or not exists (select 1 from employees e where e.employee_code = m.keep_code)
) as missing_codes;

-- 3) resolve รหัส -> id ของแต่ละคู่
create temporary table _driver_merge_pairs on commit drop as
select
  old_e.id as retired_id,
  new_e.id as keep_id,
  old_e.employee_code as retired_code,
  new_e.employee_code as keep_code,
  trim(regexp_replace(old_e.first_name, '^(นาย|นาง|นางสาว)\s*', '')) as retired_first,
  trim(old_e.last_name) as retired_last,
  trim(regexp_replace(new_e.first_name, '^(นาย|นาง|นางสาว)\s*', '')) as keep_first,
  trim(new_e.last_name) as keep_last
from _driver_merge_map m
join employees old_e on old_e.employee_code = m.retired_code
join employees new_e on new_e.employee_code = m.keep_code;

-- กันรวมรหัสเข้ากับตัวเอง (เผื่อ mapping พิมพ์ผิด)
select 1 / (case when count(*) = 0 then 1 else 0 end) from _driver_merge_pairs where retired_id = keep_id;

-- 4) ย้ายประวัติที่มี FK จริงทั้งหมดไปยังรหัสที่เก็บไว้
update vehicle_bookings vb
set employee_id = p.keep_id
from _driver_merge_pairs p
where vb.employee_id = p.retired_id;

update work_calendar wc
set employee_id = p.keep_id
from _driver_merge_pairs p
where wc.employee_id = p.retired_id;

update training_records tr
set employee_id = p.keep_id
from _driver_merge_pairs p
where tr.employee_id = p.retired_id;

update employee_status_history esh
set employee_id = p.keep_id
from _driver_merge_pairs p
where esh.employee_id = p.retired_id;

-- driver_tma_profiles เป็น 1:1 (unique partial index บน employee_id) — ย้ายเฉพาะกรณีที่รหัส
-- ที่เก็บไว้ยังไม่มีโปรไฟล์ TMA ของตัวเอง ถ้ามีอยู่แล้วปล่อยโปรไฟล์เดิมติดกับรหัสที่ถูกปิดไว้
-- เป็นหลักฐานเฉยๆ (ไม่ลบ เพื่อไม่ให้ข้อมูลหาย)
update driver_tma_profiles dtp
set employee_id = p.keep_id
from _driver_merge_pairs p
where dtp.employee_id = p.retired_id
  and not exists (
    select 1 from driver_tma_profiles dtp2 where dtp2.employee_id = p.keep_id
  );

-- 5) รวมสถิติสะสม + ใช้วันเริ่มงานที่เก่าที่สุด (รักษาอายุงานจริง)
-- reliability_score / utilization_rate เป็นค่า 0-100 (เปอร์เซ็นต์/คะแนน) การ sum จะทำให้ค่าเพี้ยน
-- เกิน 100 ได้ จึงใช้ค่าที่สูงกว่าแทนการบวกสำหรับสองฟิลด์นี้เท่านั้น
-- กัน double-count: ถ้ารหัสนี้ถูกรวมไปแล้วจากการรันครั้งก่อน (merged_into_employee_id ไม่ null)
-- ให้ข้ามสถิติของคู่นี้ ไม่บวกซ้ำ — สำคัญเฉพาะกรณีไฟล์นี้ถูกรันซ้ำผ่าน db:migrate:replay เท่านั้น
-- (npm run db:migrate ปกติไม่รันไฟล์ที่เคย apply แล้วอยู่แล้วเพราะมี ledger กันไว้)
update employees keep_e
set total_days_worked = keep_e.total_days_worked + old_e.total_days_worked,
    total_income = keep_e.total_income + old_e.total_income,
    total_cost = keep_e.total_cost + old_e.total_cost,
    total_issues = keep_e.total_issues + old_e.total_issues,
    reliability_score = greatest(keep_e.reliability_score, old_e.reliability_score),
    utilization_rate = greatest(keep_e.utilization_rate, old_e.utilization_rate),
    join_date = least(keep_e.join_date, old_e.join_date)
from _driver_merge_pairs p
join employees old_e on old_e.id = p.retired_id
where keep_e.id = p.keep_id
  and old_e.merged_into_employee_id is null;

-- 6) ปรับตารางที่อ้างชื่อ/รหัสคนขับเป็น text ธรรมดา (ไม่มี FK) ให้ชี้มาที่คนเดียวกัน
-- หมายเหตุ: เทียบจากชื่อ-สกุลแบบตัดคำนำหน้าออกทั้งสองฝั่ง (เหมือน logic ที่ใช้ตรวจจับชื่อซ้ำเดิม)
-- เป็น best-effort เพราะไม่มี FK ยืนยัน ควรสุ่มตรวจแถวที่ถูกแก้หลังรันเสร็จ
update accident_cases ac
set employee_name = trim(
  coalesce(keep_e.title_prefix, '') || ' ' || keep_e.first_name || ' ' || keep_e.last_name
)
from _driver_merge_pairs p
join employees keep_e on keep_e.id = p.keep_id
where trim(regexp_replace(ac.employee_name, '^(นาย|นาง|นางสาว)\s*', '')) = trim(p.retired_first || ' ' || p.retired_last)
   or trim(regexp_replace(ac.employee_name, '^(นาย|นาง|นางสาว)\s*', '')) = trim(p.keep_first || ' ' || p.keep_last);

update complaints c
set driver_name = trim(
      coalesce(keep_e.title_prefix, '') || ' ' || keep_e.first_name || ' ' || keep_e.last_name
    ),
    employee_id = keep_e.employee_code
from _driver_merge_pairs p
join employees keep_e on keep_e.id = p.keep_id
where c.employee_id = p.retired_code
   or trim(regexp_replace(c.driver_name, '^(นาย|นาง|นางสาว)\s*', '')) = trim(p.retired_first || ' ' || p.retired_last)
   or trim(regexp_replace(c.driver_name, '^(นาย|นาง|นางสาว)\s*', '')) = trim(p.keep_first || ' ' || p.keep_last);

update issue_reports ir
set employee_name = trim(
      coalesce(keep_e.title_prefix, '') || ' ' || keep_e.first_name || ' ' || keep_e.last_name
    ),
    employee_id = keep_e.employee_code
from _driver_merge_pairs p
join employees keep_e on keep_e.id = p.keep_id
where ir.employee_id = p.retired_code
   or trim(regexp_replace(ir.employee_name, '^(นาย|นาง|นางสาว)\s*', '')) = trim(p.retired_first || ' ' || p.retired_last)
   or trim(regexp_replace(ir.employee_name, '^(นาย|นาง|นางสาว)\s*', '')) = trim(p.keep_first || ' ' || p.keep_last);

-- 7) ปิดใช้งานรหัสที่ถูกรวม (ไม่ลบแถว) พร้อมบันทึก audit
update employees old_e
set status = 'inactive',
    merged_into_employee_id = p.keep_id,
    merged_at = now()
from _driver_merge_pairs p
where old_e.id = p.retired_id;
