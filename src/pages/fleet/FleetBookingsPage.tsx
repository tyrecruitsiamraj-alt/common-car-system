import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/contexts/AuthContext';
import type { Employee, Vehicle, VehicleBooking } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimeHm24Select } from '@/components/shared/TimeHm24Select';
import { cn } from '@/lib/utils';
import {
  parse,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addHours,
  setHours,
  setMinutes,
  eachDayOfInterval,
  isSameMonth,
  isBefore,
  startOfHour,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ViewMode = 'month' | 'week' | 'day' | 'hour';

export type FleetBookingsMode = 'book' | 'monitor';

type AvailabilityPayload = {
  from: string;
  to: string;
  availableEmployees: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_code'>[];
  availableVehicles: Pick<Vehicle, 'id' | 'plate_no' | 'label' | 'seats'>[];
};

/** คำนวณความว่างแบบเดียวกับ API เมื่อ endpoint availability ตอบผิดพลาด */
function computeLocalAvailability(
  from: Date,
  to: Date,
  bookingRows: VehicleBooking[],
  employees: Employee[],
  vehicles: Vehicle[],
): AvailabilityPayload {
  const overlaps = (b: VehicleBooking) => {
    const s = parseISO(b.starts_at);
    const e = parseISO(b.ends_at);
    return s < to && e > from;
  };
  const busyEmp = new Set(bookingRows.filter(overlaps).map((b) => b.employee_id));
  const busyVeh = new Set(bookingRows.filter(overlaps).map((b) => b.vehicle_id));
  const availableEmployees = employees
    .filter((e) => e.status === 'active' && !busyEmp.has(e.id))
    .map((e) => ({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      employee_code: e.employee_code,
    }))
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'th'));
  const availableVehicles = vehicles
    .filter((v) => v.is_active !== false && !busyVeh.has(v.id))
    .map((v) => ({
      id: v.id,
      plate_no: v.plate_no,
      label: v.label,
      seats: v.seats,
    }))
    .sort((a, b) => a.plate_no.localeCompare(b.plate_no, 'th'));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    availableEmployees,
    availableVehicles,
  };
}

async function parseApiError(r: Response): Promise<string> {
  const j = (await r.json().catch(() => ({}))) as { message?: string; error?: string; path?: string };
  const parts = [j.message, j.error].filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  let s = parts.join(' — ');
  if (!s) s = `HTTP ${r.status}`;
  if (j.path && (r.status === 404 || /not found/i.test(s))) s += ` (${j.path})`;
  return s;
}

function computeListRange(
  viewMode: ViewMode,
  monthValue: string,
  dayValue: string,
  bookStart: string,
  bookEnd: string,
): { from: Date; to: Date } | null {
  try {
    if (viewMode === 'month') {
      const d = parse(`${monthValue}-01`, 'yyyy-MM-dd', new Date());
      if (Number.isNaN(d.getTime())) return null;
      return { from: startOfMonth(d), to: endOfMonth(d) };
    }
    if (viewMode === 'week' || viewMode === 'day') {
      const d = parse(dayValue, 'yyyy-MM-dd', new Date());
      if (Number.isNaN(d.getTime())) return null;
      if (viewMode === 'day') {
        return { from: startOfDay(d), to: endOfDay(d) };
      }
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const we = endOfWeek(d, { weekStartsOn: 1 });
      return { from: startOfDay(ws), to: endOfDay(we) };
    }
    const resolved = resolveBookingWindow(bookStart, bookEnd);
    if (!resolved) return null;
    return { from: resolved.from, to: resolved.to };
  } catch {
    return null;
  }
}

/** ช่วงจองสำหรับ UI/API — ถ้าสิ้นสุดไม่ถูกต้องจะถือว่าสิ้นสุด = เริ่ม +1 ชม. (กันค่าว่างระหว่างเลือกวัน/เวลา) */
function resolveBookingWindow(bookStart: string, bookEnd: string): { from: Date; to: Date } | null {
  const s = new Date(bookStart);
  if (Number.isNaN(s.getTime())) return null;
  let e = new Date(bookEnd);
  if (Number.isNaN(e.getTime()) || e <= s) {
    e = addHours(s, 1);
  }
  return { from: s, to: e };
}

function bookingSegmentOnLocalDay(b: VehicleBooking, day: Date): { startH: number; endH: number } | null {
  const s = parseISO(b.starts_at);
  const e = parseISO(b.ends_at);
  const d0 = startOfDay(day);
  const d1 = endOfDay(day);
  if (s >= d1 || e <= d0) return null;
  const vs = s < d0 ? d0 : s;
  const ve = e > d1 ? d1 : e;
  const msDay = 86_400_000;
  const startH = (vs.getTime() - d0.getTime()) / msDay * 24;
  const endH = (ve.getTime() - d0.getTime()) / msDay * 24;
  if (startH >= endH) return null;
  return { startH, endH: Math.min(24, endH) };
}

function bookingsOverlappingDay(bookings: VehicleBooking[], day: Date): VehicleBooking[] {
  const d0 = startOfDay(day);
  const d1 = endOfDay(day);
  return bookings
    .filter((b) => {
      const s = parseISO(b.starts_at);
      const e = parseISO(b.ends_at);
      return s < d1 && e > d0;
    })
    .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime());
}

function bookingOverlapsLocalHour(b: VehicleBooking, day: Date, hour: number): boolean {
  const slotStart = setMinutes(setHours(day, hour), 0);
  const slotEnd = addHours(slotStart, 1);
  const s = parseISO(b.starts_at);
  const e = parseISO(b.ends_at);
  return s < slotEnd && e > slotStart;
}

/** ช่วงชั่วโมงที่ว่าง (ท้องถิ่น) แบบครอบคลุม [startH, endH) โดย endH เป็น exclusive 0–24 */
function freeHourRangesOnLocalDay(
  bookings: VehicleBooking[],
  day: Date,
  matchBooking: (b: VehicleBooking) => boolean,
): { startH: number; endH: number }[] {
  const busy = Array.from({ length: 24 }, (_, h) =>
    bookings.some((b) => matchBooking(b) && bookingOverlapsLocalHour(b, day, h)),
  );
  const ranges: { startH: number; endH: number }[] = [];
  let i = 0;
  while (i < 24) {
    if (busy[i]) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < 24 && !busy[i]) i += 1;
    ranges.push({ startH: start, endH: i });
  }
  return ranges;
}

function formatLocalFreeHourRange(day: Date, startH: number, endH: number): string {
  const a = format(setMinutes(setHours(day, startH), 0), 'HH:mm');
  const b = endH >= 24 ? '24:00' : format(setMinutes(setHours(day, endH), 0), 'HH:mm');
  return `${a}–${b}`;
}

function employeeMatchesPlannerFilter(e: Employee, qNorm: string): boolean {
  if (!qNorm) return true;
  const t = `${e.first_name} ${e.last_name} ${e.employee_code} ${e.nickname ?? ''}`.toLowerCase();
  return t.includes(qNorm);
}

function vehicleMatchesPlannerFilter(v: Vehicle, qNorm: string): boolean {
  if (!qNorm) return true;
  const t = `${v.plate_no} ${v.label ?? ''}`.toLowerCase();
  return t.includes(qNorm);
}

function bookingVehicleMatchesFilter(b: VehicleBooking, vehMap: Map<string, Vehicle>, qNorm: string): boolean {
  if (!qNorm) return true;
  const v = vehMap.get(b.vehicle_id);
  return v ? vehicleMatchesPlannerFilter(v, qNorm) : b.vehicle_id.toLowerCase().includes(qNorm);
}

function abbrevJoined(items: string[], maxLen: number): string {
  const s = items.join(', ');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1))}…`;
}

function isIncidentBooking(b: VehicleBooking): boolean {
  const n = (b.notes || '').trim();
  return /อุบัติ|อุบัติเหตุ|accident|crash|ชน/i.test(n);
}

function dayPlannerStatusForEmployee(bookings: VehicleBooking[], empId: string, day: Date): 'free' | 'busy' | 'incident' {
  const onDay = bookingsOverlappingDay(
    bookings.filter((b) => b.employee_id === empId),
    day,
  );
  if (onDay.length === 0) return 'free';
  if (onDay.some(isIncidentBooking)) return 'incident';
  return 'busy';
}

const WEEKDAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] as const;

function driverShort(id: string, empMap: Map<string, Employee>): string {
  const e = empMap.get(id);
  if (!e) return '?';
  const n = (e.nickname || e.first_name || '').trim();
  return n || '?';
}

function plateShort(id: string, vehMap: Map<string, Vehicle>): string {
  const p = vehMap.get(id)?.plate_no?.trim();
  return p || '?';
}

function toDatetimeLocalValue(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

/** ดึง yyyy-MM-dd จากค่า datetime string (รองรับทั้ง …T… และ date เดี่ยว) */
function ymdFromDatetimeLocalField(v: string): string | null {
  const dPart = (v.split('T')[0] ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(dPart) ? dPart : null;
}

/** ขั้นนาทีในตัวเลือกเวลา — ทุก 10 นาที */
const BOOK_MINUTE_STEP = 10;

/** ดึง HH:mm จาก yyyy-MM-ddTHH:mm */
function hmFromBookField(v: string): string {
  const t = (v.split('T')[1] ?? '09:00').slice(0, 5);
  return /^\d{2}:\d{2}$/.test(t) ? t : '09:00';
}

/** รวมวัน + เวลาเป็นรูปแบบที่ใช้ใน state (yyyy-MM-dd'T'HH:mm) */
function combineBookYmdHm(ymd: string, hm: string): string {
  const d = (ymd ?? '').trim();
  let h = (hm ?? '').trim().slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return `${format(new Date(), 'yyyy-MM-dd')}T09:00`;
  }
  if (!/^\d{2}:\d{2}$/.test(h)) h = '09:00';
  return `${d}T${h}`;
}

/** ชั่วโมงถัดไปเมื่อเวลาปัจจุบันไม่ตรงขอบชั่วโมง */
function ceilToNextHour(d: Date): Date {
  const h = startOfHour(d);
  return d.getTime() > h.getTime() ? addHours(h, 1) : h;
}

/** ช่วงจองเริ่มต้นสำหรับวันที่เลือก — วันอดีตใช้ 09:00–10:00 ของวันนั้น; วันนี้/อนาคตไม่ย้อนกว่าเวลาปัจจุบันเมื่อเป็นวันนี้ */
function defaultBookRangeForDay(day: Date): { start: Date; end: Date } {
  const tick = new Date();
  const day0 = startOfDay(day);
  const nine = setMinutes(setHours(day0, 9), 0);
  const ten = addHours(nine, 1);
  if (isBefore(day0, startOfDay(tick))) {
    return { start: nine, end: ten };
  }
  if (isBefore(startOfDay(tick), day0)) {
    return { start: nine, end: ten };
  }
  if (isBefore(tick, nine)) {
    return { start: nine, end: ten };
  }
  const f = ceilToNextHour(tick);
  return { start: f, end: addHours(f, 1) };
}

type FleetBookingsPageProps = {
  mode?: FleetBookingsMode;
};

const FleetBookingsPage: React.FC<FleetBookingsPageProps> = ({ mode = 'book' }) => {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('supervisor');
  const isMonitor = mode === 'monitor';

  const [viewMode, setViewMode] = useState<ViewMode>(() => (mode === 'monitor' ? 'month' : 'day'));
  const [monthValue, setMonthValue] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dayValue, setDayValue] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  /** ช่วงจองจริง + ใช้คำนวณว่าง — แยกจากช่วง “โหลดรายการ” เพื่อไม่ให้เทียบทั้งวัน/ทั้งเดือน */
  const [bookStart, setBookStart] = useState(() => {
    const r = defaultBookRangeForDay(startOfDay(new Date()));
    return toDatetimeLocalValue(r.start);
  });
  const [bookEnd, setBookEnd] = useState(() => {
    const r = defaultBookRangeForDay(startOfDay(new Date()));
    return toDatetimeLocalValue(r.end);
  });

  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [empMap, setEmpMap] = useState<Map<string, Employee>>(new Map());
  const [vehMap, setVehMap] = useState<Map<string, Vehicle>>(new Map());
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [selEmp, setSelEmp] = useState('');
  const [selVeh, setSelVeh] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  /** กรองชื่อ/รหัสพนักงาน และทะเบียน/ชื่อเรียกรถ — ใช้กับตารางรายวัน/รายชั่วโมงและสรุปด้านล่าง */
  const [plannerFilterEmp, setPlannerFilterEmp] = useState('');
  const [plannerFilterVeh, setPlannerFilterVeh] = useState('');

  const [empDayDialog, setEmpDayDialog] = useState<{
    employee: Employee;
    day: Date;
    rows: VehicleBooking[];
  } | null>(null);

  useEffect(() => {
    if (mode === 'book' && (viewMode === 'month' || viewMode === 'week')) {
      setViewMode('day');
    }
  }, [mode, viewMode]);

  const listRange = useMemo(
    () => computeListRange(viewMode, monthValue, dayValue, bookStart, bookEnd),
    [viewMode, monthValue, dayValue, bookStart, bookEnd],
  );

  const bookingWindow = useMemo(() => resolveBookingWindow(bookStart, bookEnd), [bookStart, bookEnd]);

  useEffect(() => {
    if (isMonitor) return;
    const s = new Date(bookStart);
    const e = new Date(bookEnd);
    if (Number.isNaN(s.getTime()) || !bookStart?.trim()) return;
    if (Number.isNaN(e.getTime()) || e <= s) {
      const fixed = toDatetimeLocalValue(addHours(s, 1));
      if (fixed !== bookEnd) setBookEnd(fixed);
    }
  }, [isMonitor, bookStart, bookEnd]);

  useEffect(() => {
    if (isMonitor) return;
    const d = parse(dayValue, 'yyyy-MM-dd', new Date());
    if (Number.isNaN(d.getTime())) return;
    const ymd = format(d, 'yyyy-MM-dd');
    const curDate = (bookStart.split('T')[0] ?? '').trim();
    if (curDate === ymd) return;

    if (viewMode === 'hour') {
      const s = new Date(bookStart);
      const e = new Date(bookEnd);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
        const { start, end } = defaultBookRangeForDay(startOfDay(d));
        setBookStart(toDatetimeLocalValue(start));
        setBookEnd(toDatetimeLocalValue(end));
        return;
      }
      const prevDay0 = startOfDay(s);
      const targetDay0 = startOfDay(d);
      const deltaMs = targetDay0.getTime() - prevDay0.getTime();
      setBookStart(toDatetimeLocalValue(new Date(s.getTime() + deltaMs)));
      setBookEnd(toDatetimeLocalValue(new Date(e.getTime() + deltaMs)));
      return;
    }

    if (viewMode === 'day' || viewMode === 'week') {
      const { start, end } = defaultBookRangeForDay(startOfDay(d));
      setBookStart(toDatetimeLocalValue(start));
      setBookEnd(toDatetimeLocalValue(end));
      return;
    }

    if (viewMode === 'month') {
      const dm = parse(`${monthValue}-01`, 'yyyy-MM-dd', new Date());
      if (Number.isNaN(dm.getTime())) return;
      const { start, end } = defaultBookRangeForDay(startOfDay(dm));
      setBookStart(toDatetimeLocalValue(start));
      setBookEnd(toDatetimeLocalValue(end));
    }
  }, [isMonitor, viewMode, dayValue, monthValue]);

  const refresh = useCallback(async () => {
    if (!listRange || !bookingWindow) {
      setBookings([]);
      setAvailability(null);
      setAvailabilityError(null);
      setLoading(false);
      return;
    }
    const fetchFrom = new Date(Math.min(listRange.from.getTime(), bookingWindow.from.getTime()));
    const fetchTo = new Date(Math.max(listRange.to.getTime(), bookingWindow.to.getTime()));
    const qList = new URLSearchParams({ from: fetchFrom.toISOString(), to: fetchTo.toISOString() });
    const qAvail = new URLSearchParams({
      from: bookingWindow.from.toISOString(),
      to: bookingWindow.to.toISOString(),
      availability: '1',
    });
    setLoading(true);
    setAvailabilityError(null);
    try {
      const [rBook, rAvail, rEmp, rVeh] = await Promise.all([
        apiFetch(`/api/vehicle-bookings?${qList}`),
        apiFetch(`/api/vehicle-bookings?${qAvail}`),
        apiFetch('/api/employees?limit=500'),
        apiFetch('/api/vehicles'),
      ]);

      let bookingRows: VehicleBooking[] = [];
      if (rBook.ok) {
        const data = (await rBook.json()) as unknown;
        bookingRows = Array.isArray(data) ? data : [];
      }
      setBookings(bookingRows);

      let employees: Employee[] = [];
      if (rEmp.ok) {
        const data = (await rEmp.json()) as unknown;
        employees = Array.isArray(data) ? data : [];
        setEmpMap(new Map(employees.map((e) => [e.id, e])));
      } else {
        setEmpMap(new Map());
      }

      let vehicles: Vehicle[] = [];
      if (rVeh.ok) {
        const data = (await rVeh.json()) as unknown;
        vehicles = Array.isArray(data) ? data : [];
        setVehMap(new Map(vehicles.map((v) => [v.id, v])));
      } else {
        setVehMap(new Map());
      }

      const applyAvailability = (payload: AvailabilityPayload | null) => {
        setAvailability(payload);
        if (!payload) return;
        setSelEmp((prev) => (prev && payload.availableEmployees.some((e) => e.id === prev) ? prev : ''));
        setSelVeh((prev) => (prev && payload.availableVehicles.some((v) => v.id === prev) ? prev : ''));
      };

      let availErr: string | null = null;
      let serverAvail: AvailabilityPayload | null = null;
      if (rAvail.ok) {
        const raw = (await rAvail.json()) as unknown;
        if (
          raw &&
          typeof raw === 'object' &&
          Array.isArray((raw as AvailabilityPayload).availableEmployees) &&
          Array.isArray((raw as AvailabilityPayload).availableVehicles)
        ) {
          serverAvail = raw as AvailabilityPayload;
        }
      } else {
        availErr = await parseApiError(rAvail);
      }

      const localAvail =
        employees.length && vehicles.length
          ? computeLocalAvailability(bookingWindow.from, bookingWindow.to, bookingRows, employees, vehicles)
          : null;

      if (localAvail) {
        applyAvailability(localAvail);
        setAvailabilityError(null);
      } else if (serverAvail) {
        applyAvailability(serverAvail);
        setAvailabilityError(null);
      } else {
        applyAvailability(null);
        setAvailabilityError(availErr || 'โหลดความว่างไม่สำเร็จ');
      }
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
      setAvailability(null);
      setSelEmp('');
      setSelVeh('');
      setAvailabilityError('เครือข่ายหรือเซิร์ฟเวอร์ไม่ตอบ — ลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [listRange, bookingWindow]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** คำนวณความว่างจากช่วงจอง + รายการจองที่โหลดแล้ว — อัปเดตทันทีเมื่อเปลี่ยนเวลา (ไม่ต้องรอเฉพาะค่าจาก API) */
  const slotDerivedAvailability = useMemo(() => {
    if (!bookingWindow || isMonitor) return null;
    const employees = Array.from(empMap.values());
    const vehicles = Array.from(vehMap.values());
    if (employees.length === 0 || vehicles.length === 0) return null;
    return computeLocalAvailability(bookingWindow.from, bookingWindow.to, bookings, employees, vehicles);
  }, [bookingWindow, bookings, empMap, vehMap, isMonitor]);

  useEffect(() => {
    if (isMonitor) return;
    const da = slotDerivedAvailability ?? availability;
    if (!da) return;
    setSelEmp((prev) => (prev && da.availableEmployees.some((e) => e.id === prev) ? prev : ''));
    setSelVeh((prev) => (prev && da.availableVehicles.some((v) => v.id === prev) ? prev : ''));
  }, [isMonitor, slotDerivedAvailability, availability]);

  /** วันที่จาก date picker — แกน 0–23 ชม. ในมุมมองรายวัน/รายชั่วโมง (ไม่ใช้แค่วันที่จากช่อง datetime จอง เพื่อไม่ให้แท่งคลาดชั่วโมง) */
  const dayAnchor = useMemo(() => {
    const d = parse(dayValue, 'yyyy-MM-dd', new Date());
    return Number.isNaN(d.getTime()) ? startOfDay(new Date()) : startOfDay(d);
  }, [dayValue]);

  const timelineDay = useMemo(() => {
    if (viewMode === 'day' || viewMode === 'hour') {
      return dayAnchor;
    }
    const part = (bookStart.split('T')[0] ?? '').trim();
    const d = parse(part, 'yyyy-MM-dd', new Date());
    return Number.isNaN(d.getTime()) ? startOfDay(new Date()) : startOfDay(d);
  }, [viewMode, dayAnchor, bookStart]);

  const empLabel = (id: string) => {
    const e = empMap.get(id);
    return e ? `${e.first_name} ${e.last_name}` : id.slice(0, 8);
  };
  const vehLabel = (id: string) => {
    const v = vehMap.get(id);
    if (!v) return id.slice(0, 8);
    return v.label?.trim() ? `${v.plate_no} · ${v.label}` : v.plate_no;
  };

  const vehiclesForGrid = useMemo(() => {
    const list = Array.from(vehMap.values()).filter((v) => v.is_active !== false);
    list.sort((a, b) => a.plate_no.localeCompare(b.plate_no, 'th'));
    return list;
  }, [vehMap]);

  const onTimelineClick = (vehicleId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (isMonitor) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const h = Math.min(23, Math.max(0, Math.floor((x / rect.width) * 24)));
    const day = timelineDay;
    let from = setMinutes(setHours(day, h), 0);
    let to = addHours(from, 1);
    setBookStart(toDatetimeLocalValue(from));
    setBookEnd(toDatetimeLocalValue(to));
    setSelVeh(vehicleId);
  };

  const hourSlotLabel = (h: number) => {
    const day = timelineDay;
    const from = setMinutes(setHours(day, h), 0);
    const to = addHours(from, 1);
    return `${format(from, 'HH:mm')}–${format(to, 'HH:mm')}`;
  };

  const employeesForPlanner = useMemo(() => {
    return Array.from(empMap.values())
      .filter((e) => e.status !== 'inactive' && e.status !== 'suspended')
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'th'));
  }, [empMap]);

  const plannerEmpFilterNorm = useMemo(() => plannerFilterEmp.trim().toLowerCase(), [plannerFilterEmp]);
  const plannerVehFilterNorm = useMemo(() => plannerFilterVeh.trim().toLowerCase(), [plannerFilterVeh]);

  const filteredEmployeesForPlanner = useMemo(
    () => employeesForPlanner.filter((e) => employeeMatchesPlannerFilter(e, plannerEmpFilterNorm)),
    [employeesForPlanner, plannerEmpFilterNorm],
  );

  const filteredVehiclesForGrid = useMemo(
    () => vehiclesForGrid.filter((v) => vehicleMatchesPlannerFilter(v, plannerVehFilterNorm)),
    [vehiclesForGrid, plannerVehFilterNorm],
  );

  const onEmployeeHourClick = (employeeId: string, hour: number) => {
    if (isMonitor) return;
    const busy = bookings.some(
      (b) => b.employee_id === employeeId && bookingOverlapsLocalHour(b, timelineDay, hour),
    );
    if (busy) return;
    const day = timelineDay;
    let from = setMinutes(setHours(day, hour), 0);
    let to = addHours(from, 1);
    setBookStart(toDatetimeLocalValue(from));
    setBookEnd(toDatetimeLocalValue(to));
    setSelEmp(employeeId);
    setSelVeh('');
  };

  const showVehicleHourGrid = viewMode === 'day' && listRange && bookingWindow;
  const showEmployeeHourPlanner = viewMode === 'hour' && listRange && bookingWindow;

  const monthAnchor = useMemo(() => parse(`${monthValue}-01`, 'yyyy-MM-dd', new Date()), [monthValue]);
  const daysInSelectedMonth = useMemo(() => {
    if (Number.isNaN(monthAnchor.getTime())) return [];
    return eachDayOfInterval({ start: startOfMonth(monthAnchor), end: endOfMonth(monthAnchor) });
  }, [monthAnchor]);
  const monthGridDays = useMemo(() => {
    if (Number.isNaN(monthAnchor.getTime())) return [];
    const from = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
    const to = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: from, end: to });
  }, [monthAnchor]);
  const monthWeekCount = monthGridDays.length > 0 ? monthGridDays.length / 7 : 0;

  const weekDays = useMemo(() => {
    const d = parse(dayValue, 'yyyy-MM-dd', new Date());
    if (Number.isNaN(d.getTime())) return [];
    const from = startOfWeek(d, { weekStartsOn: 1 });
    const to = endOfWeek(d, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: from, end: to });
  }, [dayValue]);

  const dayBookingsList = useMemo(() => bookingsOverlappingDay(bookings, dayAnchor), [bookings, dayAnchor]);

  /** รายวัน: โฟกัสวันที่เลือก (รวมวันย้อนหลัง — ใช้บันทึกย้อนหลังได้) */
  const selectDayForView = (d: Date) => {
    setDayValue(format(d, 'yyyy-MM-dd'));
    setViewMode('day');
  };

  const dayBusyRows = useMemo(() => {
    const onDay = bookingsOverlappingDay(bookings, dayAnchor);
    const byEmp = new Map<string, VehicleBooking[]>();
    for (const b of onDay) {
      const cur = byEmp.get(b.employee_id) ?? [];
      cur.push(b);
      byEmp.set(b.employee_id, cur);
    }
    for (const arr of byEmp.values()) {
      arr.sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime());
    }
    return [...byEmp.entries()]
      .map(([id, bs]) => {
        const emp = empMap.get(id);
        return emp ? { emp, bookings: bs } : null;
      })
      .filter((x): x is { emp: Employee; bookings: VehicleBooking[] } => x !== null)
      .sort((a, b) =>
        `${a.emp.first_name} ${a.emp.last_name}`.localeCompare(`${b.emp.first_name} ${b.emp.last_name}`, 'th'),
      );
  }, [bookings, dayAnchor, empMap]);

  const dayFreeEmployees = useMemo(() => {
    const busy = new Set(dayBusyRows.map((r) => r.emp.id));
    return employeesForPlanner.filter((e) => !busy.has(e.id));
  }, [employeesForPlanner, dayBusyRows]);

  const dayBusyRowsFiltered = useMemo(() => {
    return dayBusyRows
      .filter(({ emp }) => employeeMatchesPlannerFilter(emp, plannerEmpFilterNorm))
      .map(({ emp, bookings: bs }) => ({
        emp,
        bookings: plannerVehFilterNorm ? bs.filter((b) => bookingVehicleMatchesFilter(b, vehMap, plannerVehFilterNorm)) : bs,
      }))
      .filter(({ bookings: bs }) => bs.length > 0);
  }, [dayBusyRows, plannerEmpFilterNorm, plannerVehFilterNorm, vehMap]);

  const dayFreeEmployeesFiltered = useMemo(
    () => dayFreeEmployees.filter((e) => employeeMatchesPlannerFilter(e, plannerEmpFilterNorm)),
    [dayFreeEmployees, plannerEmpFilterNorm],
  );

  const dayFreeIds = useMemo(() => new Set(dayFreeEmployees.map((e) => e.id)), [dayFreeEmployees]);

  const dayPartialFreeEmployees = useMemo(() => {
    const out: { emp: Employee; label: string }[] = [];
    for (const emp of employeesForPlanner) {
      if (!employeeMatchesPlannerFilter(emp, plannerEmpFilterNorm)) continue;
      if (dayFreeIds.has(emp.id)) continue;
      const ranges = freeHourRangesOnLocalDay(bookings, dayAnchor, (b) => b.employee_id === emp.id);
      if (ranges.length === 0) continue;
      const label = ranges.map((r) => formatLocalFreeHourRange(dayAnchor, r.startH, r.endH)).join(', ');
      out.push({ emp, label });
    }
    out.sort((a, b) =>
      `${a.emp.first_name} ${a.emp.last_name}`.localeCompare(`${b.emp.first_name} ${b.emp.last_name}`, 'th'),
    );
    return out;
  }, [bookings, dayAnchor, employeesForPlanner, dayFreeIds, plannerEmpFilterNorm]);

  const freeEmployeeNamesByHour = useMemo(() => {
    const hours: string[][] = Array.from({ length: 24 }, () => []);
    for (const emp of employeesForPlanner) {
      if (!employeeMatchesPlannerFilter(emp, plannerEmpFilterNorm)) continue;
      for (let h = 0; h < 24; h += 1) {
        const busy = bookings.some(
          (b) => b.employee_id === emp.id && bookingOverlapsLocalHour(b, dayAnchor, h),
        );
        if (!busy) hours[h].push(`${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code);
      }
    }
    return hours;
  }, [bookings, dayAnchor, employeesForPlanner, plannerEmpFilterNorm]);

  const freeVehiclePlatesByHour = useMemo(() => {
    const hours: string[][] = Array.from({ length: 24 }, () => []);
    for (const v of vehiclesForGrid) {
      if (!vehicleMatchesPlannerFilter(v, plannerVehFilterNorm)) continue;
      for (let h = 0; h < 24; h += 1) {
        const busy = bookings.some(
          (b) => b.vehicle_id === v.id && bookingOverlapsLocalHour(b, dayAnchor, h),
        );
        if (!busy) hours[h].push(v.plate_no);
      }
    }
    return hours;
  }, [bookings, dayAnchor, vehiclesForGrid, plannerVehFilterNorm]);

  const vehicleHourGridEl =
    showVehicleHourGrid && vehiclesForGrid.length > 0 ? (
      filteredVehiclesForGrid.length > 0 ? (
      <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
        <div className="shrink-0 px-2 py-1 border-b border-border bg-muted/20 text-[10px] font-medium text-foreground">
          รายวัน — รถ × ชั่วโมง ({format(timelineDay, 'dd/MM/yyyy')}){' '}
          {isMonitor ? '(ดูอย่างเดียว)' : 'คลิกช่องว่างเลือกรถและช่วงจอง'}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="w-full min-h-full border border-border rounded-md overflow-hidden bg-background/50">
            <div
              className="grid w-full border-b border-border bg-muted/30 text-muted-foreground"
              style={{ gridTemplateColumns: '5.5rem repeat(24, minmax(0, 1fr))' }}
            >
              <div className="px-1 py-1 text-[10px] font-medium text-foreground border-r border-border/60 shrink-0">รถ</div>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="min-w-0 border-l border-border/50 py-0.5 px-px text-center" title={hourSlotLabel(h)}>
                  <span className="block text-[7px] sm:text-[8px] font-medium text-foreground leading-none truncate">
                    {format(setMinutes(setHours(timelineDay, h), 0), 'HH')}
                  </span>
                </div>
              ))}
            </div>
            {filteredVehiclesForGrid.map((v) => (
              <div
                key={v.id}
                className="grid w-full border-b border-border/70 last:border-b-0"
                style={{ gridTemplateColumns: '5.5rem repeat(24, minmax(0, 1fr))' }}
              >
                <div className="px-1 py-1 text-[10px] leading-tight border-r border-border/60 min-w-0">
                  <div className="font-mono font-semibold truncate">{v.plate_no}</div>
                </div>
                <div
                  className={cn(
                    'relative min-h-[2.5rem] min-w-0 bg-muted/10',
                    isMonitor ? 'cursor-default' : 'cursor-crosshair hover:bg-muted/20',
                  )}
                  style={{ gridColumn: '2 / -1' }}
                  onClick={(e) => onTimelineClick(v.id, e)}
                  aria-label={`เลือกชั่วโมง ${v.plate_no}`}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-border/25 pointer-events-none"
                      style={{ left: `${(h / 24) * 100}%`, width: `${100 / 24}%` }}
                    />
                  ))}
                  {bookings
                    .filter((b) => b.vehicle_id === v.id)
                    .map((b) => {
                      const seg = bookingSegmentOnLocalDay(b, timelineDay);
                      if (!seg) return null;
                      const left = (seg.startH / 24) * 100;
                      const width = ((seg.endH - seg.startH) / 24) * 100;
                      const title = `${driverShort(b.employee_id, empMap)} · ${plateShort(b.vehicle_id, vehMap)} · ${format(parseISO(b.starts_at), 'HH:mm')}–${format(parseISO(b.ends_at), 'HH:mm')}`;
                      const barClass =
                        'absolute top-0.5 bottom-0.5 rounded-sm bg-primary/90 text-primary-foreground text-[8px] sm:text-[9px] leading-none px-0.5 flex flex-col justify-center overflow-hidden border border-primary/30 z-[1]';
                      if (isMonitor) {
                        return (
                          <div
                            key={b.id}
                            title={title}
                            className={barClass}
                            style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                          >
                            <span className="truncate w-full text-left font-medium">{driverShort(b.employee_id, empMap)}</span>
                            <span className="truncate w-full text-left opacity-90 hidden sm:block">{plateShort(b.vehicle_id, vehMap)}</span>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={b.id}
                          type="button"
                          title={title}
                          className={barClass}
                          style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <span className="truncate w-full text-left font-medium">{driverShort(b.employee_id, empMap)}</span>
                          <span className="truncate w-full text-left opacity-90 hidden sm:block">{plateShort(b.vehicle_id, vehMap)}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : (
        <p className="text-[10px] text-muted-foreground px-2 py-2">ไม่มีรถตรงตัวกรอง — ลองล้างช่องค้นหารถ</p>
      )
    ) : showVehicleHourGrid ? (
      <p className="text-[10px] text-muted-foreground px-2 py-2">ยังไม่มีรถในระบบ</p>
    ) : null;

  const employeeHourPlannerEl =
    showEmployeeHourPlanner && employeesForPlanner.length > 0 ? (
      <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
        <div className="shrink-0 px-2 py-1 border-b border-border bg-muted/20 space-y-1">
          <p className="text-[10px] font-medium text-foreground">
            รายชั่วโมง — ใครว่างช่วงไหน ({format(timelineDay, 'dd/MM/yyyy')})
            {isMonitor ? ' (ดูอย่างเดียว)' : ' · คลิกช่องว่าง = เลือกพนักงาน + เวลา แล้วเลือกรถในฟอร์ม'}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-sm bg-emerald-500/50 border border-emerald-600/40" />
              ว่าง
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-sm bg-primary/50 border border-primary/50" />
              มีจอง
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-sm bg-amber-500/55 border border-amber-700/40" />
              ระบุอุบัติเหตุในหมายเหตุ
            </span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="w-full min-w-[720px] border border-border rounded-md overflow-hidden bg-background/50">
            <div
              className="grid border-b border-border bg-muted/30 text-muted-foreground sticky top-0 z-[1]"
              style={{ gridTemplateColumns: `8.5rem repeat(24, minmax(0, 1fr))` }}
            >
              <div className="px-1 py-1 text-[10px] font-medium text-foreground border-r border-border/60">พนักงาน</div>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="min-w-0 border-l border-border/50 py-0.5 text-center" title={hourSlotLabel(h)}>
                  <span className="text-[7px] sm:text-[8px] font-medium text-foreground">{h}</span>
                </div>
              ))}
            </div>
            {filteredEmployeesForPlanner.length === 0 ? (
              <p className="text-[10px] text-muted-foreground px-2 py-3">ไม่มีพนักงานตรงตัวกรอง — ลองล้างช่องค้นหาพนักงาน</p>
            ) : null}
            {filteredEmployeesForPlanner.map((emp) => (
              <div
                key={emp.id}
                className="grid border-b border-border/60 last:border-b-0"
                style={{ gridTemplateColumns: `8.5rem repeat(24, minmax(0, 1fr))` }}
              >
                <div className="px-1 py-1 text-[10px] leading-tight border-r border-border/60 bg-muted/10 min-w-0">
                  <div className="font-medium text-foreground line-clamp-2 leading-tight" title={empLabel(emp.id)}>
                    {emp.first_name} {emp.last_name}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">{emp.employee_code}</div>
                </div>
                {Array.from({ length: 24 }, (_, h) => {
                  const slotBs = bookings.filter(
                    (b) => b.employee_id === emp.id && bookingOverlapsLocalHour(b, timelineDay, h),
                  );
                  const first = slotBs[0];
                  const incident = slotBs.some(isIncidentBooking);
                  const busy = slotBs.length > 0;
                  const title = busy
                    ? slotBs
                        .map(
                          (b) =>
                            `${plateShort(b.vehicle_id, vehMap)} ${format(parseISO(b.starts_at), 'HH:mm')}–${format(parseISO(b.ends_at), 'HH:mm')}${b.notes?.trim() ? ` · ${b.notes}` : ''}`,
                        )
                        .join(' | ')
                    : hourSlotLabel(h);
                  const cellClass = cn(
                    'min-h-[2rem] min-w-0 border-l border-border/40 p-px text-[7px] sm:text-[8px] leading-tight transition-colors',
                    !busy && 'bg-emerald-500/15 hover:bg-emerald-500/25 cursor-pointer',
                    busy &&
                      !incident &&
                      'bg-primary/25 text-foreground border border-primary/20',
                    busy && incident && 'bg-amber-500/30 text-foreground border border-amber-600/35',
                  );
                  const inner =
                    busy && first ? (
                      <span className="line-clamp-2 break-words block text-left px-0.5">{plateShort(first.vehicle_id, vehMap)}</span>
                    ) : (
                      <span className="sr-only">ว่าง</span>
                    );
                  if (busy) {
                    return (
                      <div key={h} title={title} className={cn(cellClass, 'flex items-center')}>
                        {inner}
                      </div>
                    );
                  }
                  return (
                    <button key={h} type="button" title={title} onClick={() => onEmployeeHourClick(emp.id, h)} className={cellClass}>
                      {inner}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : showEmployeeHourPlanner ? (
      <p className="text-[10px] text-muted-foreground px-2 py-2">ยังไม่มีพนักงานในระบบ</p>
    ) : null;

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingWindow) {
      toast.error('ช่วงเวลาจองไม่ถูกต้อง (สิ้นสุดต้องหลังเริ่ม)');
      return;
    }
    if (!selEmp || !selVeh) {
      toast.error('เลือกผู้ขับและรถ');
      return;
    }
    setSaving(true);
    try {
      const r = await apiFetch('/api/vehicle-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selEmp,
          vehicle_id: selVeh,
          starts_at: bookingWindow.from.toISOString(),
          ends_at: bookingWindow.to.toISOString(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!r.ok) throw new Error(await parseApiError(r));
      toast.success('บันทึกการจองแล้ว');
      setNotes('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'จองไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const deleteBooking = async (id: string) => {
    if (!canDelete) return;
    if (!window.confirm('ยกเลิกการจองนี้?')) return;
    try {
      const r = await apiFetch(`/api/vehicle-bookings?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await parseApiError(r));
      toast.success('ลบการจองแล้ว');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    }
  };

  const todayYmd = format(new Date(), 'yyyy-MM-dd');
  const displayAvailability = bookingWindow ? (slotDerivedAvailability ?? availability) : null;

  return (
    <div className="flex flex-col min-h-0 w-full max-w-[1920px] mx-auto pb-2">
      <PageHeader
        title={isMonitor ? 'ดูภาพรวม' : 'จองรถ'}
        subtitle={
          isMonitor
            ? 'รายเดือน / สัปดาห์ / วัน / ชั่วโมง — ดูอย่างเดียว ไม่มีฟอร์มจอง · คลิกช่องสีแดง/ส้มในตารางพนักงาน×วันเพื่อดูรายละเอียด'
            : 'เลือกวันที่ (รวมย้อนหลัง) กับช่วงเวลาจอง — ระบบจะไม่รีเซ็ตเวลาที่ตั้งแล้วถ้าวันเดียวกัน · ผู้ขับ/รถในรายการคำนวณจากช่วงเวลาที่เลือกเท่านั้น'
        }
        backPath="/fleet"
      />

      <div className="flex flex-col flex-1 min-h-0 gap-2 px-2 sm:px-3 md:px-4 h-[calc(100dvh-10.5rem)] lg:h-[calc(100dvh-7.5rem)]">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(isMonitor ? (['month', 'week', 'day', 'hour'] as const) : (['day', 'hour'] as const)).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium border transition-colors touch-manipulation',
                viewMode === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground',
              )}
            >
              {m === 'month' ? 'รายเดือน' : m === 'week' ? 'รายสัปดาห์' : m === 'day' ? 'รายวัน' : 'รายชั่วโมง'}
            </button>
          ))}
        </div>

        <div className="glass-card rounded-lg border border-border p-2 sm:p-3 shrink-0 space-y-2">
          <div className="flex flex-wrap gap-3 items-end">
            {viewMode === 'month' ? (
              <div className="space-y-1 min-w-[10rem]">
                <Label className="text-xs">เดือน</Label>
                <Input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            ) : null}
            {(viewMode === 'week' || viewMode === 'day' || viewMode === 'hour') && (
              <div className="space-y-1 min-w-[10rem]">
                <Label className="text-xs">{viewMode === 'week' ? 'สัปดาห์ (เลือกวันที่ในสัปดาห์)' : 'วันที่'}</Label>
                <Input
                  type="date"
                  value={dayValue}
                  onChange={(e) => setDayValue(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}
            {listRange ? (
              <p className="text-[10px] sm:text-xs text-muted-foreground ml-auto max-w-full text-right leading-tight">
                โหลด: {format(listRange.from, 'dd/MM HH:mm')} — {format(listRange.to, 'dd/MM HH:mm')}
              </p>
            ) : (
              <p className="text-xs text-destructive">ช่วงวันที่ไม่ถูกต้อง</p>
            )}
          </div>
          {viewMode === 'hour' ? (
            <p className="text-[10px] text-muted-foreground leading-snug">
              รายชั่วโมง: ตารางพนักงาน × 24 ชม. — ช่องเขียว = ว่าง · น้ำเงิน = มีจอง (ดูทะเบียนในเซลล์) · ส้ม = มีคำว่าอุบัติเหตุในหมายเหตุ — คลิกช่องว่างแล้วเลือกรถในฟอร์ม (รองรับจองย้อนหลัง)
            </p>
          ) : viewMode === 'day' ? (
            <p className="text-[10px] text-muted-foreground leading-snug">
              รายวัน: เลือกวันที่แล้วดูว่าใครมีจอง / ใครว่างทั้งวัน — ด้านล่างมีตารางรถ×ชั่วโมง
              {!isMonitor ? ' (คลิกช่องว่างเพื่อจอง)' : ''}
            </p>
          ) : null}
          {(viewMode === 'day' || viewMode === 'hour') && (
            <div className="flex flex-wrap gap-2 sm:gap-3 items-end pt-1 border-t border-border/40 mt-1">
              <div className="flex-1 min-w-[9rem] space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">กรองพนักงาน</Label>
                <Input
                  value={plannerFilterEmp}
                  onChange={(e) => setPlannerFilterEmp(e.target.value)}
                  placeholder="ชื่อ, รหัส, ชื่อเล่น…"
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
              <div className="flex-1 min-w-[9rem] space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">กรองรถ</Label>
                <Input
                  value={plannerFilterVeh}
                  onChange={(e) => setPlannerFilterVeh(e.target.value)}
                  placeholder="ทะเบียน, ชื่อเรียก…"
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? <p className="text-xs text-muted-foreground shrink-0">กำลังโหลด…</p> : null}

        {/* ภาพรวม — พอดีหน้าจอ */}
        <div className="flex-1 min-h-0 rounded-lg border border-border bg-card/30 overflow-hidden flex flex-col">
          {viewMode === 'month' && monthGridDays.length > 0 ? (
            <div className="flex flex-col flex-1 min-h-0 gap-2 min-w-0">
              <div
                className="shrink-0 min-h-[100px] max-h-[42%] min-w-0 grid grid-cols-7 overflow-hidden rounded-md border border-border/50"
                style={{ gridTemplateRows: `auto repeat(${monthWeekCount}, minmax(0, 1fr))` }}
              >
                {WEEKDAY_LABELS.map((w) => (
                  <div
                    key={w}
                    className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1 border-b border-border/80 bg-muted/40"
                  >
                    {w}
                  </div>
                ))}
                {monthGridDays.map((day) => {
                  const inMonth = isSameMonth(day, monthAnchor);
                  const pastDay = isBefore(startOfDay(day), startOfDay(new Date()));
                  const list = bookingsOverlappingDay(bookings, day);
                  const maxChips = 4;
                  const shown = list.slice(0, maxChips);
                  const more = list.length - shown.length;
                  const cellBody = (
                    <>
                      <span className={cn('text-[10px] sm:text-xs font-bold shrink-0', inMonth ? 'text-foreground' : 'text-muted-foreground')}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
                        {shown.map((b) => (
                          <div
                            key={b.id}
                            className="rounded-sm px-0.5 py-px bg-primary/20 border border-primary/25 text-[8px] sm:text-[9px] leading-tight text-foreground"
                            title={`${driverShort(b.employee_id, empMap)} · ${plateShort(b.vehicle_id, vehMap)} · ${format(parseISO(b.starts_at), 'HH:mm')}–${format(parseISO(b.ends_at), 'HH:mm')}`}
                          >
                            <div className="truncate font-medium">
                              {driverShort(b.employee_id, empMap)} · {plateShort(b.vehicle_id, vehMap)}
                            </div>
                          </div>
                        ))}
                        {more > 0 ? (
                          <span className="text-[8px] text-muted-foreground font-medium shrink-0">+{more}</span>
                        ) : null}
                      </div>
                    </>
                  );
                  const cellClass = cn(
                    'min-h-0 min-w-0 flex flex-col border-b border-r border-border/50 p-0.5 sm:p-1 text-left',
                    !inMonth && 'bg-muted/20 opacity-60',
                    pastDay && 'opacity-80',
                    'transition-colors hover:bg-accent/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary',
                  );
                  return (
                    <button
                      key={format(day, 'yyyy-MM-dd')}
                      type="button"
                      onClick={() => selectDayForView(day)}
                      className={cn(cellClass, 'touch-manipulation text-left')}
                    >
                      {cellBody}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 min-h-0 flex flex-col border-t border-border pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 px-1 pb-1">
                  <p className="text-[10px] font-medium text-foreground">
                    พนักงาน × วัน ({format(monthAnchor, 'MMMM yyyy', { locale: th })})
                  </p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0 text-[8px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block size-2 rounded-sm bg-emerald-500/45 border border-emerald-700/30" />
                      ว่าง
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block size-2 rounded-sm bg-destructive/50 border border-destructive/45" />
                      มีจอง
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block size-2 rounded-sm bg-amber-500/50 border border-amber-700/35" />
                      อุบัติเหตุ (หมายเหตุ)
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  {employeesForPlanner.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground p-2">ไม่มีพนักงานในระบบ</p>
                  ) : (
                    <table className="w-full border-collapse text-[9px] min-w-0">
                      <thead className="sticky top-0 z-[1] bg-card shadow-sm">
                        <tr>
                          <th className="sticky left-0 z-[2] bg-card border border-border p-1 text-left w-[7rem] min-w-[7rem] max-w-[7rem]">
                            พนักงาน
                          </th>
                          {daysInSelectedMonth.map((d) => (
                            <th
                              key={format(d, 'yyyy-MM-dd')}
                              className="border border-border p-0.5 font-medium text-muted-foreground min-w-[1rem] text-center"
                            >
                              {format(d, 'd')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employeesForPlanner.map((emp) => (
                          <tr key={emp.id}>
                            <td
                              className="sticky left-0 z-[1] bg-card border border-border p-1 text-left font-medium text-foreground max-w-[7rem] truncate"
                              title={empLabel(emp.id)}
                            >
                              {emp.first_name} {emp.last_name}
                            </td>
                            {daysInSelectedMonth.map((d) => {
                              const st = dayPlannerStatusForEmployee(bookings, emp.id, d);
                              const pastD = isBefore(startOfDay(d), startOfDay(new Date()));
                              const dayList = bookingsOverlappingDay(
                                bookings.filter((b) => b.employee_id === emp.id),
                                d,
                              );
                              const title =
                                st === 'free'
                                  ? 'ว่าง'
                                  : dayList
                                      .map(
                                        (b) =>
                                          `${plateShort(b.vehicle_id, vehMap)} ${format(parseISO(b.starts_at), 'dd/MM HH:mm')}–${format(parseISO(b.ends_at), 'HH:mm')}`,
                                      )
                                      .join(' | ');
                              const chip = cn(
                                'mx-auto block h-5 w-full max-w-[1.25rem] rounded-sm border',
                                st === 'free' && 'bg-emerald-500/40 border-emerald-700/30',
                                st === 'busy' && 'bg-destructive/45 border-destructive/50',
                                st === 'incident' && 'bg-amber-500/50 border-amber-700/40',
                                pastD && 'opacity-45',
                              );
                              const openDetails = () => {
                                if (st === 'free') return;
                                setEmpDayDialog({
                                  employee: emp,
                                  day: d,
                                  rows: dayList,
                                });
                              };
                              return (
                                <td key={format(d, 'yyyy-MM-dd')} className="border border-border/70 p-px align-middle text-center">
                                  {st === 'free' ? (
                                    <span className={chip} title={title} role="presentation" />
                                  ) : (
                                    <button
                                      type="button"
                                      className={cn(chip, 'cursor-pointer hover:ring-2 hover:ring-destructive/50')}
                                      title={title}
                                      onClick={openDetails}
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {viewMode === 'week' && weekDays.length > 0 ? (
            <div className="flex-1 min-h-0 grid grid-cols-7 gap-px bg-border/60 p-px">
              {weekDays.map((day) => {
                const pastDay = isBefore(startOfDay(day), startOfDay(new Date()));
                const list = bookingsOverlappingDay(bookings, day);
                const maxChips = 12;
                const shown = list.slice(0, maxChips);
                const more = list.length - shown.length;
                return (
                  <div key={format(day, 'yyyy-MM-dd')} className="flex flex-col min-h-0 min-w-0 bg-background">
                    <button
                      type="button"
                      onClick={() => selectDayForView(day)}
                      className={cn(
                        'shrink-0 px-1 py-1.5 text-center border-b border-border touch-manipulation',
                        pastDay ? 'bg-muted/25 hover:bg-muted/40' : 'bg-muted/30 hover:bg-muted/50',
                      )}
                    >
                      <div
                        className={cn(
                          'text-[10px] font-semibold leading-none',
                          pastDay ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {format(day, 'EEE', { locale: th })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{format(day, 'd/M')}</div>
                    </button>
                    <div className="flex-1 min-h-0 overflow-y-auto p-1 space-y-1">
                      {shown.map((b) => (
                        <div
                          key={b.id}
                          className="rounded-md px-1 py-1 bg-primary/15 border border-primary/25 text-[9px] leading-tight"
                          title={`${driverShort(b.employee_id, empMap)} · ${plateShort(b.vehicle_id, vehMap)} · ${format(parseISO(b.starts_at), 'HH:mm')}–${format(parseISO(b.ends_at), 'HH:mm')}`}
                        >
                          <div className="font-medium text-foreground truncate">
                            {driverShort(b.employee_id, empMap)}
                          </div>
                          <div className="text-muted-foreground truncate">{plateShort(b.vehicle_id, vehMap)}</div>
                          <div className="text-[8px] opacity-80 tabular-nums">
                            {format(parseISO(b.starts_at), 'HH:mm')}–{format(parseISO(b.ends_at), 'HH:mm')}
                          </div>
                        </div>
                      ))}
                      {more > 0 ? <div className="text-[9px] text-muted-foreground font-medium">+{more} รายการ</div> : null}
                      {list.length === 0 ? <div className="text-[9px] text-muted-foreground/70 text-center py-2">—</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {viewMode === 'day' ? (
            <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
              <div className="shrink-0 px-2 py-2 border-b border-border bg-muted/25">
                <p className="text-sm font-semibold text-foreground">
                  วันที่ {format(dayAnchor, 'EEEE d MMMM yyyy', { locale: th })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {dayBookingsList.length} การจอง · ผู้ขับที่มีจอง {dayBusyRows.length} คน · ว่างทั้งวัน {dayFreeEmployees.length} คน
                  {(plannerEmpFilterNorm || plannerVehFilterNorm) && (
                    <span className="block mt-0.5 text-[9px] opacity-90">
                      แสดงในรายการด้านล่าง: มีจอง {dayBusyRowsFiltered.length} คน · ว่างทั้งวัน {dayFreeEmployeesFiltered.length} คน
                    </span>
                  )}
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-4">
                <section className="min-h-0">
                  <h3 className="text-[11px] font-semibold text-foreground mb-2">มีจอง / ถูกใช้งาน</h3>
                  {dayBusyRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">ไม่มีผู้ขับที่มีการจองในวันนี้ — ทุกคนในตารางว่างทั้งวัน (ตามรายชื่อที่แสดงด้านล่าง)</p>
                  ) : dayBusyRowsFiltered.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      ไม่มีผู้ขับตรงตัวกรอง (หรือไม่มีจองที่ตรงกับรถที่กรอง) — ลองล้างช่องกรองพนักงาน/รถ
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {dayBusyRowsFiltered.map(({ emp, bookings: bs }) => (
                        <li key={emp.id} className="rounded-lg border border-border bg-card/60 p-2.5">
                          <div className="text-xs font-medium text-foreground">
                            {emp.first_name} {emp.last_name}
                            <span className="text-muted-foreground font-normal"> · {emp.employee_code}</span>
                          </div>
                          <ul className="mt-1.5 space-y-1 pl-0 list-none">
                            {bs.map((b) => (
                              <li key={b.id} className="text-[11px] text-muted-foreground flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                                <span className="tabular-nums shrink-0">
                                  {format(parseISO(b.starts_at), 'HH:mm')}–{format(parseISO(b.ends_at), 'HH:mm')}
                                </span>
                                <span className="text-foreground/90">· {plateShort(b.vehicle_id, vehMap)}</span>
                                {isIncidentBooking(b) ? (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">อุบัติเหตุ</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section>
                  <h3 className="text-[11px] font-semibold text-foreground mb-2">ว่างทั้งวัน</h3>
                  {dayFreeEmployees.length === 0 ? (
                    <p className="text-xs text-muted-foreground">ไม่มีผู้ขับว่าง (ทุกคนมีจองคร่อมวันนี้)</p>
                  ) : dayFreeEmployeesFiltered.length === 0 ? (
                    <p className="text-xs text-muted-foreground">ไม่มีผู้ขับว่างทั้งวันตรงตัวกรอง — ลองล้างช่องกรองพนักงาน</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {dayFreeEmployeesFiltered.map((e) => (
                        <span
                          key={e.id}
                          className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 border border-emerald-600/25"
                        >
                          {e.first_name} {e.last_name}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
                <section>
                  <h3 className="text-[11px] font-semibold text-foreground mb-2">ว่างบางช่วง (มีจองบางชั่วโมง)</h3>
                  {dayPartialFreeEmployees.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      ไม่มีผู้ขับที่ &quot;ว่างบางช่วง&quot; ในวันนี้ — ทุกคนที่มีจองจะถูกนับใน &quot;มีจอง&quot; ส่วนที่เหลือว่างทั้งวัน
                    </p>
                  ) : (
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                      {dayPartialFreeEmployees.map(({ emp, label }) => (
                        <li
                          key={emp.id}
                          className="text-[11px] rounded-md border border-border/70 bg-muted/20 px-2 py-1.5 text-foreground"
                        >
                          <span className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-muted-foreground"> · ว่าง </span>
                          <span className="tabular-nums text-foreground/90">{label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <details className="rounded-md border border-border/60 bg-card/30 overflow-hidden">
                  <summary className="px-2 py-2 text-[11px] font-medium cursor-pointer select-none list-none marker:content-none [&::-webkit-details-marker]:hidden hover:bg-muted/30">
                    สรุปรายชั่วโมง — ใครว่าง / รถไหนว่าง (ชม. ท้องถิ่น 0–23)
                  </summary>
                  <div className="border-t border-border/50 max-h-52 overflow-y-auto">
                    <table className="w-full text-[10px]">
                      <thead className="sticky top-0 bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium px-2 py-1 w-10 border-b border-border/60">ชม.</th>
                          <th className="text-left font-medium px-1 py-1 border-b border-border/60">พนักงานว่าง</th>
                          <th className="text-left font-medium px-1 py-1 border-b border-border/60">รถว่าง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 24 }, (_, h) => {
                          const empNames = freeEmployeeNamesByHour[h] ?? [];
                          const plates = freeVehiclePlatesByHour[h] ?? [];
                          const empText = abbrevJoined(empNames, 96);
                          const vehText = abbrevJoined(plates, 72);
                          return (
                            <tr key={h} className="border-b border-border/40 last:border-b-0 align-top">
                              <td className="tabular-nums px-2 py-1 text-foreground font-medium whitespace-nowrap">{h}</td>
                              <td className="px-1 py-1 text-muted-foreground" title={empNames.join(', ')}>
                                {empNames.length ? empText : <span className="opacity-50">—</span>}
                              </td>
                              <td className="px-1 py-1 text-muted-foreground" title={plates.join(', ')}>
                                {plates.length ? vehText : <span className="opacity-50">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
              <details className="shrink-0 border-t border-border bg-card/20" defaultOpen={!isMonitor}>
                <summary className="px-2 py-2 text-[11px] font-medium cursor-pointer select-none list-none marker:content-none [&::-webkit-details-marker]:hidden hover:bg-muted/30">
                  ตารางรถ × ชั่วโมง {isMonitor ? '(กดเพื่อดูรายละเอียดตามชั่วโมง)' : '(กดเพื่อจอง — คลิกช่องว่างบนแถวรถ)'}
                </summary>
                <div className="h-[min(38vh,22rem)] min-h-[168px] border-t border-border/50 overflow-hidden flex flex-col">
                  {vehicleHourGridEl}
                </div>
              </details>
            </div>
          ) : null}

          {viewMode === 'hour' ? (
            <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">{employeeHourPlannerEl}</div>
          ) : null}
        </div>

        {!isMonitor && listRange ? (
          <form
            lang="th-TH"
            onSubmit={submitBooking}
            className="glass-card rounded-lg border border-border p-2 sm:p-3 shrink-0 max-h-[32vh] overflow-y-auto space-y-2"
          >
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">เวลาจอง</p>
              <p className="text-[10px] text-muted-foreground">เลือกชั่วโมง–นาทีแบบ 24 ชม. (ไม่มี AM/PM) — นาทีทุก 10 นาที</p>
              <div className="space-y-3 max-w-lg">
                <div className="space-y-1.5">
                  <Label className="text-[10px]">เริ่ม</Label>
                  <div className="flex flex-wrap gap-2 items-end">
                    <Input
                      type="date"
                      className="h-8 text-xs min-w-[10.5rem] flex-1"
                      value={ymdFromDatetimeLocalField(bookStart) ?? ''}
                      onChange={(e) => {
                        const ymd = e.target.value;
                        if (!ymd) return;
                        const next = combineBookYmdHm(ymd, hmFromBookField(bookStart));
                        const t = new Date(next);
                        if (Number.isNaN(t.getTime())) return;
                        setBookStart(next);
                        setDayValue((prev) => (prev !== ymd ? ymd : prev));
                        const ne = new Date(bookEnd);
                        if (!Number.isNaN(ne.getTime()) && ne <= t) {
                          setBookEnd(toDatetimeLocalValue(addHours(t, 1)));
                        }
                      }}
                    />
                    <TimeHm24Select
                      className="flex flex-wrap gap-1.5 items-end shrink-0"
                      selectClassName="h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground min-w-[3.75rem]"
                      minuteStep={BOOK_MINUTE_STEP}
                      value={hmFromBookField(bookStart)}
                      onChange={(hm) => {
                        if (!hm) return;
                        const ymd = ymdFromDatetimeLocalField(bookStart) ?? todayYmd;
                        const next = combineBookYmdHm(ymd, hm);
                        const t = new Date(next);
                        if (Number.isNaN(t.getTime())) return;
                        setBookStart(next);
                        const ymd2 = ymdFromDatetimeLocalField(next);
                        if (ymd2) setDayValue((prev) => (prev !== ymd2 ? ymd2 : prev));
                        const ne = new Date(bookEnd);
                        if (!Number.isNaN(ne.getTime()) && ne <= t) {
                          setBookEnd(toDatetimeLocalValue(addHours(t, 1)));
                        }
                      }}
                      aria-label="เวลาเริ่ม"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">สิ้นสุด</Label>
                  <div className="flex flex-wrap gap-2 items-end">
                    <Input
                      type="date"
                      className="h-8 text-xs min-w-[10.5rem] flex-1"
                      min={ymdFromDatetimeLocalField(bookStart) ?? undefined}
                      value={ymdFromDatetimeLocalField(bookEnd) ?? ''}
                      onChange={(e) => {
                        const ymd = e.target.value;
                        if (!ymd) return;
                        const startY = ymdFromDatetimeLocalField(bookStart) ?? todayYmd;
                        if (ymd < startY) {
                          toast.error('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
                          return;
                        }
                        const next = combineBookYmdHm(ymd, hmFromBookField(bookEnd));
                        const b = new Date(next);
                        const a = new Date(bookStart);
                        if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && b <= a) {
                          setBookEnd(toDatetimeLocalValue(addHours(a, 1)));
                          return;
                        }
                        setBookEnd(next);
                        const ymd2 = ymdFromDatetimeLocalField(next);
                        if (ymd2) setDayValue((prev) => (prev !== ymd2 ? ymd2 : prev));
                      }}
                    />
                    <TimeHm24Select
                      className="flex flex-wrap gap-1.5 items-end shrink-0"
                      selectClassName="h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground min-w-[3.75rem]"
                      minuteStep={BOOK_MINUTE_STEP}
                      minHm={
                        (ymdFromDatetimeLocalField(bookEnd) ?? '') === (ymdFromDatetimeLocalField(bookStart) ?? '')
                          ? hmFromBookField(bookStart)
                          : undefined
                      }
                      value={hmFromBookField(bookEnd)}
                      onChange={(hm) => {
                        if (!hm) return;
                        const ymd =
                          ymdFromDatetimeLocalField(bookEnd) ?? ymdFromDatetimeLocalField(bookStart) ?? todayYmd;
                        const next = combineBookYmdHm(ymd, hm);
                        const b = new Date(next);
                        const a = new Date(bookStart);
                        if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && b <= a) {
                          setBookEnd(toDatetimeLocalValue(addHours(a, 1)));
                          return;
                        }
                        setBookEnd(next);
                        const ymd2 = ymdFromDatetimeLocalField(next);
                        if (ymd2) setDayValue((prev) => (prev !== ymd2 ? ymd2 : prev));
                      }}
                      aria-label="เวลาสิ้นสุด"
                    />
                  </div>
                </div>
              </div>
              {!bookingWindow ? (
                <p className="text-[10px] text-muted-foreground pt-0.5">เลือกวัน–เวลาเริ่มให้ครบ — ถ้าสิ้นสุดชนกับเริ่ม ระบบจะตั้งสิ้นสุดเป็น +1 ชม. ให้อัตโนมัติ</p>
              ) : null}
            </div>

            {loading && !displayAvailability ? (
              <p className="text-[10px] text-muted-foreground">กำลังโหลดความว่าง…</p>
            ) : !displayAvailability ? (
              <div className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-[10px] space-y-1">
                <p className="break-words">{availabilityError || 'โหลดความว่างไม่สำเร็จ'}</p>
                <button type="button" className="text-primary underline font-medium" onClick={() => void refresh()}>
                  ลองอีกครั้ง
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px]">
                    ผู้ขับว่างในช่วงที่เลือก ({displayAvailability.availableEmployees.length})
                  </Label>
                  <select
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs min-w-0"
                    value={selEmp}
                    onChange={(e) => setSelEmp(e.target.value)}
                    required
                  >
                    <option value="">เลือก</option>
                    {displayAvailability.availableEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px]">
                    รถว่างในช่วงที่เลือก ({displayAvailability.availableVehicles.length})
                  </Label>
                  <select
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs min-w-0"
                    value={selVeh}
                    onChange={(e) => setSelVeh(e.target.value)}
                    required
                  >
                    <option value="">เลือก</option>
                    {displayAvailability.availableVehicles.map((ve) => (
                      <option key={ve.id} value={ve.id}>
                        {ve.plate_no}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[8rem] space-y-0.5">
                <Label className="text-[10px]">หมายเหตุ</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-xs" placeholder="ทางเลือก" />
              </div>
              <button
                type="submit"
                disabled={saving || loading || !selEmp || !selVeh || !displayAvailability}
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 shrink-0"
              >
                {saving ? '…' : 'บันทึก'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="glass-card rounded-lg border border-border overflow-hidden shrink-0 min-h-0 flex flex-col max-h-[22vh]">
          <div className="px-2 py-1 border-b border-border text-[10px] sm:text-xs font-medium shrink-0">
            {isMonitor ? 'รายการจองในช่วงโหลด (ดูอย่างเดียว)' : 'รายการจองในช่วงโหลด'}
          </div>
          {bookings.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">ไม่มีการจอง</div>
          ) : (
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-[10px] sm:text-xs table-fixed border-collapse">
                <thead className="sticky top-0 bg-card z-[1] shadow-sm">
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="p-1.5 font-medium w-[22%]">เริ่ม</th>
                    <th className="p-1.5 font-medium w-[22%]">สิ้นสุด</th>
                    <th className="p-1.5 font-medium w-[26%] truncate">ผู้ขับ</th>
                    <th className="p-1.5 font-medium w-[22%] truncate">รถ</th>
                    {canDelete && !isMonitor ? <th className="p-1 w-8" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-border/60">
                      <td className="p-1.5 align-top tabular-nums whitespace-nowrap">{format(parseISO(b.starts_at), 'dd/MM HH:mm')}</td>
                      <td className="p-1.5 align-top tabular-nums whitespace-nowrap">{format(parseISO(b.ends_at), 'dd/MM HH:mm')}</td>
                      <td className="p-1.5 align-top min-w-0">
                        <div className="line-clamp-2 break-words" title={empLabel(b.employee_id)}>
                          {empLabel(b.employee_id)}
                        </div>
                      </td>
                      <td className="p-1.5 align-top min-w-0">
                        <div className="line-clamp-2 break-words" title={vehLabel(b.vehicle_id)}>
                          {vehLabel(b.vehicle_id)}
                        </div>
                      </td>
                      {canDelete && !isMonitor ? (
                        <td className="p-1 align-top">
                          <button
                            type="button"
                            className="text-[10px] text-destructive hover:underline"
                            onClick={() => void deleteBooking(b.id)}
                          >
                            ลบ
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={empDayDialog !== null} onOpenChange={(open) => !open && setEmpDayDialog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {empDayDialog ? (
            <>
              <DialogHeader>
                <DialogTitle>รายละเอียดการจอง</DialogTitle>
                <DialogDescription className="text-left space-y-1">
                  <span className="block">
                    <span className="font-medium text-foreground">
                      {empDayDialog.employee.first_name} {empDayDialog.employee.last_name}
                    </span>
                    {empDayDialog.employee.employee_code ? (
                      <span className="text-muted-foreground"> · {empDayDialog.employee.employee_code}</span>
                    ) : null}
                  </span>
                  <span className="block">วันที่ {format(empDayDialog.day, 'EEEE d MMMM yyyy', { locale: th })}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {empDayDialog.rows.length === 0 ? (
                  <p className="text-muted-foreground text-xs">ไม่มีรายการในวันนี้</p>
                ) : (
                  <ul className="space-y-2">
                    {empDayDialog.rows.map((b) => (
                      <li key={b.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                        <div className="font-medium text-foreground">{vehLabel(b.vehicle_id)}</div>
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {format(parseISO(b.starts_at), 'dd/MM/yyyy HH:mm')} — {format(parseISO(b.ends_at), 'HH:mm')}
                        </div>
                        {b.notes?.trim() ? (
                          <div className="text-xs text-foreground/90 pt-1 border-t border-border/60">
                            <span className="text-muted-foreground">หมายเหตุ: </span>
                            {b.notes.trim()}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetBookingsPage;
