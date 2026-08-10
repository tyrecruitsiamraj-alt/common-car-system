import { parseISO } from 'date-fns';
import { formatThaiDateTime } from '@/lib/thaiDateTimeFormat';
import { BOOKING_JOB_TYPE_LABELS } from '@/lib/bookingUiMessages';
import type { Employee, Vehicle, VehicleBookingAudit, VehicleBookingJobType } from '@/types';

const FIELD_LABELS: Record<string, string> = {
  employee_id: 'ผู้ขับ',
  vehicle_id: 'รถ',
  starts_at: 'เริ่ม',
  ends_at: 'สิ้นสุด',
  destination: 'สถานที่ที่ไป',
  document_no: 'เลขที่เอกสาร',
  job_type: 'ประเภทงาน',
  notes: 'หมายเหตุ',
  status: 'สถานะ',
};

export function formatBookingAuditValue(
  key: string,
  value: unknown,
  empMap: Map<string, Employee>,
  vehMap: Map<string, Vehicle>,
): string {
  if (value == null || value === '') return '—';
  const s = String(value);
  if (key === 'employee_id') {
    const e = empMap.get(s);
    return e ? `${e.first_name} ${e.last_name}` : s.slice(0, 8) + '…';
  }
  if (key === 'vehicle_id') {
    const v = vehMap.get(s);
    return v?.plate_no ?? s.slice(0, 8) + '…';
  }
  if (key === 'starts_at' || key === 'ends_at') {
    try {
      return formatThaiDateTime(parseISO(s));
    } catch {
      return s;
    }
  }
  if (key === 'status') return s === 'cancelled' ? 'ยกเลิก' : 'ใช้งาน';
  if (key === 'job_type') return BOOKING_JOB_TYPE_LABELS[s as VehicleBookingJobType] ?? s;
  return s;
}

export function diffBookingAuditEntry(
  a: VehicleBookingAudit,
  empMap: Map<string, Employee>,
  vehMap: Map<string, Vehicle>,
): string[] {
  const lines: string[] = [];
  const oldV = (a.old_value ?? {}) as Record<string, unknown>;
  const newV = (a.new_value ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
  for (const k of keys) {
    if (k === 'id' || k === 'created_at' || k === 'updated_at') continue;
    const o = oldV[k];
    const n = newV[k];
    if (JSON.stringify(o) === JSON.stringify(n)) continue;
    const label = FIELD_LABELS[k] ?? k;
    if (a.action === 'created') {
      lines.push(`${label}: ${formatBookingAuditValue(k, n, empMap, vehMap)}`);
    } else if (a.action === 'cancelled') {
      lines.push(`${label}: ${formatBookingAuditValue(k, o, empMap, vehMap)} → ยกเลิก`);
    } else {
      lines.push(
        `${label}: ${formatBookingAuditValue(k, o, empMap, vehMap)} → ${formatBookingAuditValue(k, n, empMap, vehMap)}`,
      );
    }
  }
  return lines;
}
