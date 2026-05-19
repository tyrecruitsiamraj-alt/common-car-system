import type { Employee } from '@/types';
import { apiFetch } from '@/lib/apiFetch';
import { toYmdLocal } from '@/lib/dateTh';
import { createEmployee, getEmployees, updateEmployeeInDemo } from '@/lib/demoStorage';
import { isDemoMode } from '@/lib/demoMode';

export type SimpleEmployeeInput = {
  first_name: string;
  last_name: string;
  phone: string;
};

function nextDemoEmployeeCode(): string {
  const items = getEmployees();
  let max = 0;
  for (const e of items) {
    const m = /^EMP-(\d+)$/i.exec(e.employee_code);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `EMP-${String(max + 1).padStart(3, '0')}`;
}

/** เพิ่มผู้ขับแบบสั้น — ชื่อ นามสกุล เบอร์โทร (ค่าอื่น API/demo เติมให้) */
export async function createEmployeeSimple(input: SimpleEmployeeInput): Promise<Employee> {
  const first_name = input.first_name.trim();
  const last_name = input.last_name.trim();
  const phone = input.phone.trim();

  if (!first_name || !last_name || !phone) {
    throw new Error('กรุณากรอกชื่อ นามสกุล และเบอร์โทร');
  }

  if (isDemoMode()) {
    return createEmployee({
      employee_code: nextDemoEmployeeCode(),
      first_name,
      last_name,
      phone,
      status: 'active',
      position: 'ผู้ขับ',
      join_date: toYmdLocal(new Date()),
    });
  }

  const r = await apiFetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name, last_name, phone }),
  });

  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message || body?.error || 'บันทึกไม่สำเร็จ');
  }

  return (await r.json()) as Employee;
}

export type UpdateEmployeeInput = {
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone?: string;
};

/** แก้ไขข้อมูลผู้ขับ — ส่งเฉพาะฟิลด์ที่เปลี่ยน */
export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
  if (isDemoMode()) {
    const cur = getEmployees().find((e) => e.id === id);
    if (!cur) throw new Error('ไม่พบผู้ขับ');
    return updateEmployeeInDemo(id, {
      employee_code: input.employee_code?.trim() ?? cur.employee_code,
      first_name: input.first_name?.trim() ?? cur.first_name,
      last_name: input.last_name?.trim() ?? cur.last_name,
      nickname: input.nickname !== undefined ? input.nickname.trim() || undefined : cur.nickname,
      phone: input.phone?.trim() ?? cur.phone,
    });
  }

  const r = await apiFetch('/api/employees', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...input }),
  });

  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message || body?.error || 'แก้ไขไม่สำเร็จ');
  }

  return (await r.json()) as Employee;
}
