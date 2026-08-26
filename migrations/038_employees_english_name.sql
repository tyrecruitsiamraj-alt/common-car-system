-- ชื่อ-นามสกุลภาษาอังกฤษของพนักงานขับรถ (ใช้แสดงในตารางเวลา/ปฏิทินคนขับ)
alter table employees
  add column if not exists english_name text null;
