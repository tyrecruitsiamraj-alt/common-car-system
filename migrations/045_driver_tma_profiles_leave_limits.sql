-- เพิ่มคอลัมน์วันลาจากไฟล์ "Database TMA.xlsx" เวอร์ชันใหม่ (มีคอลัมน์ Sick/Private/Annual Leave Limit เพิ่มเข้ามา)
-- ไม่กระทบคอลัมน์เดิม/ข้อมูลเดิมในตาราง driver_tma_profiles
alter table driver_tma_profiles
  add column if not exists sick_leave_limit numeric null,
  add column if not exists private_leave_limit numeric null,
  add column if not exists annual_leave_limit numeric null;
