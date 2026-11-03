-- รวมคนขับที่ชื่อซ้ำกันหมวด B และ E ตามรายงานตรวจสอบรายชื่อผู้ขับซ้ำ (Drivers)
-- หมวด B (9 กลุ่ม): ซ้ำกันเองในชุด import เดียวกัน (SR/TD ซ้ำกับ SR/TD) ไม่มีประวัติการจองทั้งคู่
-- หมวด E (1 กลุ่ม): ซ้ำจากการ import Excel ล่าสุดที่รันคนละ process พร้อมกัน
-- ไม่รวมหมวด D (2 กลุ่ม) — ตั้งใจแยกรหัสคนละตำแหน่ง (Position Driver / Temp Driver) ตามที่อนุมัติไว้แล้ว
-- ดู migrations/050_driver_duplicates_category_d_reviewed.sql
--
-- กลไกเหมือน migrations/048 ทุกประการ: ย้าย FK จริงทั้งหมด, รวมสถิติสะสม, ใช้ join_date เก่าสุด,
-- ปรับตารางอ้างชื่อ/รหัสแบบ text (accident_cases/complaints/issue_reports), ปิดใช้งาน (ไม่ลบ)
-- รหัสที่ถูกรวม พร้อม audit ว่าไปรวมกับใคร

alter table employees
  add column if not exists merged_into_employee_id uuid null references employees (id),
  add column if not exists merged_at timestamptz null;

create index if not exists employees_merged_into_idx
  on employees (merged_into_employee_id)
  where merged_into_employee_id is not null;

create temporary table _driver_merge_map (
  retired_code text primary key,
  keep_code text not null
) on commit drop;

insert into _driver_merge_map (retired_code, keep_code) values
  ('SR 0907', 'SR 1016'),  -- เกษม เวชชเศรษฐนนท์
  ('SR 0861', 'SR 1040'),  -- ณัฐภูมินทร์ ทวีชัย
  ('SR 1079', 'SR 1140'),  -- พิทยา ธุระพระ
  ('TD0103', 'SR 1166'),   -- เกรียงไกร อันทะผลา (รหัสไม่มีเว้นวรรค คนละคนกับ 'TD 0103' ด้านล่าง)
  ('SR 0657', 'TD 0103'),  -- กัมปนาท ทบน้อย (รหัสมีเว้นวรรค คนละคนกับ 'TD0103' ด้านบน)
  ('SR 0975', 'SR 1090'),  -- ศุภโชค ววงขุนทด
  ('SR 0990', 'SR 1017'),  -- ภาคภูมิ ศรีสมวงค์
  ('SR 1018', 'TD 0114'),  -- ชัยวัฒน์ เสนาไชย (รหัสมีเว้นวรรค คนละคนกับ 'TD0114' ด้านล่าง)
  ('TD 0006', 'TD 0036'),  -- กิตติธเนศ พราวศรีศักดิ์
  ('TD0114', 'EMP-057');   -- พรพล จันทร์แก้ว (หมวด E, รหัสไม่มีเว้นวรรค คนละคนกับ 'TD 0114' ด้านบน)

-- (หารด้วย count(*) ที่คำนวณจากข้อมูลจริง แทน literal 0 ตรงๆ เพราะ "select 1/0" เป็นค่าคงที่
--  ที่ planner ของ Postgres จะพับ/ตรวจตอน plan เลยโดยไม่สนว่า subquery มีแถวหรือไม่)
select 1 / (case when count(*) = 0 then 1 else 0 end) from (
  select m.retired_code
  from _driver_merge_map m
  where not exists (select 1 from employees e where e.employee_code = m.retired_code)
     or not exists (select 1 from employees e where e.employee_code = m.keep_code)
) as missing_codes;

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

select 1 / (case when count(*) = 0 then 1 else 0 end) from _driver_merge_pairs where retired_id = keep_id;

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

update driver_tma_profiles dtp
set employee_id = p.keep_id
from _driver_merge_pairs p
where dtp.employee_id = p.retired_id
  and not exists (
    select 1 from driver_tma_profiles dtp2 where dtp2.employee_id = p.keep_id
  );

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
where keep_e.id = p.keep_id;

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

update employees old_e
set status = 'inactive',
    merged_into_employee_id = p.keep_id,
    merged_at = now()
from _driver_merge_pairs p
where old_e.id = p.retired_id;
