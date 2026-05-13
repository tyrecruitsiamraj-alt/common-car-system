/**
 * รัน migration ใหม่ทั้งหมดไปที่ schema จาก PGSCHEMA (ค่าเริ่ม car_stamp)
 * โดยลบประวัติใน public._jarvis_migrations ก่อน — ใช้เมื่อ DBeaver เห็น car_stamp ว่างแต่ระบบบอกว่า migrate แล้ว
 * (มักเกิดจากเคยรัน migrate ตอนไม่มี search_path → ตารางไปอยู่ public)
 *
 * รัน: npm run db:migrate:replay
 */
process.env.DB_REPLAY_MIGRATIONS = "1";
await import("./migrate.mjs");
