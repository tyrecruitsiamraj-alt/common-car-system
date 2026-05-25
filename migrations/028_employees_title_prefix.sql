-- คำนำหน้าผู้ขับ (นาย / นาง / นางสาว ฯลฯ)
alter table employees
  add column if not exists title_prefix text null;
