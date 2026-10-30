export type WorkHoursPeriod = 'day' | 'week' | 'month' | 'year';

export const WORK_HOURS_PERIODS: WorkHoursPeriod[] = ['day', 'week', 'month', 'year'];

export const WORK_HOURS_PERIOD_LABELS: Record<WorkHoursPeriod, string> = {
  day: 'รายวัน',
  week: 'รายสัปดาห์',
  month: 'รายเดือน',
  year: 'รายปี',
};

/** ต้องตรงกับฝั่ง backend (api/_handlers/work-hours-summary.ts, holidays.ts, ot-settings.ts) */
export const ACCESS_WORK_HOURS_CAPABILITY = 'access_work_hours';

export type OtSettings = {
  ot_rate_1_5x: number;
  ot_rate_3x: number;
  full_time_threshold_hours: number;
  supervisor_ot_alert_hours: number;
  updated_at: string;
};

export type Holiday = {
  id: string;
  holiday_date: string;
  name: string;
  holiday_type: 'official' | 'company';
};

export type WorkHoursEmployeeSummary = {
  employee_id: string;
  name: string;
  position: string;
  total_hours: number;
  normal_hours: number;
  ot_hours: number;
  ot_cost: number;
  days_worked: number;
  avg_hours_per_day: number;
  status: 'active' | 'idle';
};

export type WorkHoursDailyEntry = {
  booking_id: string;
  date: string;
  vehicle_plate: string | null;
  starts_at: string;
  completed_at: string;
  total_hours: number;
  normal_hours: number;
  ot_hours: number;
  ot_cost: number;
  is_holiday: boolean;
};

export type WorkHoursSummaryResponse = {
  period: WorkHoursPeriod;
  from: string;
  to: string;
  settings: OtSettings;
  summary: {
    total_employees: number;
    active_count: number;
    idle_count: number;
    total_hours: number;
    total_normal_hours: number;
    total_ot_hours: number;
    estimated_ot_cost: number;
  };
  employees: WorkHoursEmployeeSummary[];
  daily?: WorkHoursDailyEntry[];
};

export type WorkHoursTrendPoint = {
  month: string;
  from: string;
  to: string;
  total_employees: number;
  active_count: number;
  idle_count: number;
  total_hours: number;
  total_normal_hours: number;
  total_ot_hours: number;
  estimated_ot_cost: number;
  avg_hours_per_day: number | null;
};

export type WorkHoursTrendResponse = {
  months: number;
  threshold: number;
  employee_scoped: boolean;
  trend: WorkHoursTrendPoint[];
};

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** "2026-03" -> "มี.ค. 69" (ปี พ.ศ. 2 หลัก) */
export function workHoursTrendMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  const idx = Number(m) - 1;
  const buddhistYearShort = (Number(y) + 543) % 100;
  return `${THAI_MONTHS_SHORT[idx] ?? key} ${String(buddhistYearShort).padStart(2, '0')}`;
}
