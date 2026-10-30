import { dbQuery } from '../_lib/postgres.js';
import { withAuth, sendError, handleApiError, type ApiRes, type AuthedReq } from '../_lib/http.js';
import { getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import { userHasCapability } from '../_lib/userPermissions.js';
import { ACCESS_WORK_HOURS_CAPABILITY, periodBounds, splitWorkHours, type WorkHoursPeriod } from '../_lib/workHours.js';

const bookingsTbl = tableInAppSchema('vehicle_bookings');
const employeesTbl = tableInAppSchema('employees');
const vehiclesTbl = tableInAppSchema('vehicles');
const holidaysTbl = tableInAppSchema('holidays');
const otSettingsTbl = tableInAppSchema('ot_settings');

type EmployeeRow = { id: string; first_name: string; last_name: string; position: string };
type BookingRow = {
  booking_id: string;
  employee_id: string;
  starts_at: string | Date;
  completed_at: string | Date;
  plate_no: string | null;
};
type OtSettingsRow = {
  ot_rate_1_5x: string | number;
  ot_rate_3x: string | number;
  full_time_threshold_hours: string | number;
  supervisor_ot_alert_hours: string | number;
};

async function canAccess(req: AuthedReq): Promise<boolean> {
  return (
    req.user.role === 'admin' ||
    req.user.role === 'supervisor' ||
    (await userHasCapability(req.user.sub, ACCESS_WORK_HOURS_CAPABILITY))
  );
}

const isPeriod = (v: unknown): v is WorkHoursPeriod =>
  v === 'day' || v === 'week' || v === 'month' || v === 'year';

async function handler(req: AuthedReq, res: ApiRes) {
  if (req.method && req.method.toUpperCase() !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }
  if (!(await canAccess(req))) {
    return sendError(res, 403, 'Forbidden', 'ไม่มีสิทธิ์เข้าถึงข้อมูลชั่วโมงทำงาน');
  }

  try {
    const periodParam = getString(req.query?.period);
    const period: WorkHoursPeriod = isPeriod(periodParam) ? periodParam : 'month';
    const dateParam = getString(req.query?.date);
    const anchor = dateParam && !Number.isNaN(new Date(dateParam).getTime()) ? new Date(dateParam) : new Date();
    const employeeId = getString(req.query?.employee_id);

    const { from, to } = periodBounds(period, anchor);

    const [{ rows: settingsRows }, { rows: employees }, { rows: holidayRows }] = await Promise.all([
      dbQuery<OtSettingsRow>(`select * from ${otSettingsTbl} where id = true limit 1`, []),
      dbQuery<EmployeeRow>(
        employeeId
          ? `select id, first_name, last_name, position from ${employeesTbl} where id = $1::uuid`
          : `select id, first_name, last_name, position from ${employeesTbl} where status = 'active' order by first_name asc`,
        employeeId ? [employeeId] : [],
      ),
      dbQuery<{ holiday_date: string | Date }>(
        `select holiday_date from ${holidaysTbl} where holiday_date >= $1::date and holiday_date <= $2::date`,
        [from, to],
      ),
    ]);

    const settings = settingsRows[0];
    if (!settings) return sendError(res, 500, 'ยังไม่ได้ตั้งค่า OT');
    const otRate15 = Number(settings.ot_rate_1_5x);
    const otRate3 = Number(settings.ot_rate_3x);
    const threshold = Number(settings.full_time_threshold_hours);

    const holidaySet = new Set(
      holidayRows.map((h) => (h.holiday_date instanceof Date ? h.holiday_date.toISOString().slice(0, 10) : h.holiday_date)),
    );

    const bookingParams: unknown[] = [from, to];
    let bookingWhere = `where b.completed_at is not null and b.starts_at::date >= $1::date and b.starts_at::date <= $2::date`;
    if (employeeId) {
      bookingParams.push(employeeId);
      bookingWhere += ` and b.employee_id = $${bookingParams.length}::uuid`;
    }

    const { rows: bookings } = await dbQuery<BookingRow>(
      `select b.id as booking_id, b.employee_id, b.starts_at, b.completed_at, v.plate_no
       from ${bookingsTbl} b
       left join ${vehiclesTbl} v on v.id = b.vehicle_id
       ${bookingWhere}
       order by b.starts_at asc`,
      bookingParams,
    );

    type Acc = {
      employee_id: string;
      name: string;
      position: string;
      total_hours: number;
      normal_hours: number;
      ot_hours: number;
      ot_cost: number;
      days: Set<string>;
    };
    const byEmployee = new Map<string, Acc>();
    for (const e of employees) {
      byEmployee.set(e.id, {
        employee_id: e.id,
        name: `${e.first_name} ${e.last_name}`.trim(),
        position: e.position,
        total_hours: 0,
        normal_hours: 0,
        ot_hours: 0,
        ot_cost: 0,
        days: new Set(),
      });
    }

    const daily: {
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
    }[] = [];

    for (const b of bookings) {
      const acc = byEmployee.get(b.employee_id);
      if (!acc) continue;
      const startsAt = b.starts_at instanceof Date ? b.starts_at : new Date(b.starts_at);
      const completedAt = b.completed_at instanceof Date ? b.completed_at : new Date(b.completed_at);
      const dateYmd = startsAt.toISOString().slice(0, 10);
      const isHoliday = holidaySet.has(dateYmd);
      const { totalHours, normalHours, otHours } = splitWorkHours(startsAt, completedAt);
      const otCost = otHours * (isHoliday ? otRate3 : otRate15);

      acc.total_hours += totalHours;
      acc.normal_hours += normalHours;
      acc.ot_hours += otHours;
      acc.ot_cost += otCost;
      acc.days.add(dateYmd);

      if (employeeId) {
        daily.push({
          booking_id: b.booking_id,
          date: dateYmd,
          vehicle_plate: b.plate_no,
          starts_at: startsAt.toISOString(),
          completed_at: completedAt.toISOString(),
          total_hours: Math.round(totalHours * 100) / 100,
          normal_hours: Math.round(normalHours * 100) / 100,
          ot_hours: Math.round(otHours * 100) / 100,
          ot_cost: Math.round(otCost),
          is_holiday: isHoliday,
        });
      }
    }

    const employeeSummaries = [...byEmployee.values()]
      .map((acc) => ({
        employee_id: acc.employee_id,
        name: acc.name,
        position: acc.position,
        total_hours: Math.round(acc.total_hours * 100) / 100,
        normal_hours: Math.round(acc.normal_hours * 100) / 100,
        ot_hours: Math.round(acc.ot_hours * 100) / 100,
        ot_cost: Math.round(acc.ot_cost),
        days_worked: acc.days.size,
        status: (acc.total_hours > threshold ? 'active' : 'idle') as 'active' | 'idle',
      }))
      .sort((a, b) => b.total_hours - a.total_hours);

    const totalHoursAll = employeeSummaries.reduce((s, e) => s + e.total_hours, 0);
    const totalOtHoursAll = employeeSummaries.reduce((s, e) => s + e.ot_hours, 0);
    const totalOtCostAll = employeeSummaries.reduce((s, e) => s + e.ot_cost, 0);
    const activeCount = employeeSummaries.filter((e) => e.status === 'active').length;

    return res.status(200).json({
      period,
      from,
      to,
      settings: {
        ot_rate_1_5x: otRate15,
        ot_rate_3x: otRate3,
        full_time_threshold_hours: threshold,
        supervisor_ot_alert_hours: Number(settings.supervisor_ot_alert_hours),
      },
      summary: {
        total_employees: employeeSummaries.length,
        active_count: activeCount,
        idle_count: employeeSummaries.length - activeCount,
        total_hours: Math.round(totalHoursAll * 100) / 100,
        total_ot_hours: Math.round(totalOtHoursAll * 100) / 100,
        estimated_ot_cost: Math.round(totalOtCostAll),
      },
      employees: employeeSummaries,
      ...(employeeId ? { daily } : {}),
    });
  } catch (e) {
    return handleApiError(res, e, 'work-hours-summary GET', { userId: req.user.sub });
  }
}

export default withAuth(handler);
