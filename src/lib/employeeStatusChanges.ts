import type { Employee, EmployeeChangeType, EmployeeStatusHistory } from '@/types';
import { apiFetch } from '@/lib/apiFetch';
import { isDemoMode } from '@/lib/demoMode';
import {
  cancelPendingEmployeeChangeInDemo,
  getEmployeeStatusHistory,
  scheduleEmployeeChangeInDemo,
  type ScheduleEmployeeChangeInput,
} from '@/lib/demoStorage';

export type { EmployeeChangeType, ScheduleEmployeeChangeInput };

/** ตั้งเวลาการเปลี่ยนแปลงสถานะ/ตำแหน่งผู้ขับ (ลาออก/เปลี่ยนตัว/เปลี่ยนตำแหน่ง-เปลี่ยนนาย) พร้อมวันที่มีผล */
export async function scheduleEmployeeChange(input: ScheduleEmployeeChangeInput): Promise<Employee> {
  if (isDemoMode()) {
    return scheduleEmployeeChangeInDemo(input);
  }

  const r = await apiFetch('/api/employee-status-changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message || body?.error || 'บันทึกไม่สำเร็จ');
  }

  const refreshed = await apiFetch(`/api/employees?id=${encodeURIComponent(input.employee_id)}`);
  if (!refreshed.ok) throw new Error('บันทึกสำเร็จ แต่โหลดข้อมูลล่าสุดไม่สำเร็จ');
  return (await refreshed.json()) as Employee;
}

/** ยกเลิกการเปลี่ยนแปลงที่ตั้งเวลาไว้แต่ยังไม่ถึงวันที่มีผล */
export async function cancelPendingEmployeeChange(employeeId: string): Promise<Employee> {
  if (isDemoMode()) {
    return cancelPendingEmployeeChangeInDemo(employeeId);
  }

  const r = await apiFetch(`/api/employee-status-changes?employee_id=${encodeURIComponent(employeeId)}`, {
    method: 'DELETE',
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message || body?.error || 'ยกเลิกไม่สำเร็จ');
  }

  const refreshed = await apiFetch(`/api/employees?id=${encodeURIComponent(employeeId)}`);
  if (!refreshed.ok) throw new Error('ยกเลิกสำเร็จ แต่โหลดข้อมูลล่าสุดไม่สำเร็จ');
  return (await refreshed.json()) as Employee;
}

/** ประวัติการเปลี่ยนแปลงสถานะ/ตำแหน่งของผู้ขับคนหนึ่ง (ใหม่สุดก่อน) */
export async function fetchEmployeeStatusHistory(employeeId: string): Promise<EmployeeStatusHistory[]> {
  if (isDemoMode()) {
    return getEmployeeStatusHistory(employeeId);
  }

  const r = await apiFetch(`/api/employee-status-changes?employee_id=${encodeURIComponent(employeeId)}`);
  if (!r.ok) return [];
  return (await r.json()) as EmployeeStatusHistory[];
}
