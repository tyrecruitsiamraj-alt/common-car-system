import { dbQuery } from '../_lib/postgres.js';
import { withAuth, sendError, handleApiError, type ApiRes, type AuthedReq } from '../_lib/http.js';
import { getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import { userHasCapability } from '../_lib/userPermissions.js';
import { ACCESS_WORK_HOURS_CAPABILITY, avgHoursPerDay, lastMonthBuckets, splitWorkHours } from '../_lib/workHours.js';

const bookingsTbl = tableInAppSchema('vehicle_bookings');
const employeesTbl = tableInAppSchema('employees');
const holidaysTbl = tableInAppSchema('holidays');
const otSettingsTbl = tableInAppSchema('ot_settings');

type EmployeeRow = { id: string };
type BookingRow = { employee_id: string; starts_at: string | Date; completed_at: string | Date };
type OtSettingsRow = { ot_rate_1_5x: string | number; ot_rate_3x: string | number; full_time_threshold_hours: string | number };

async function canAccess(req: AuthedReq): Promise<boolean> {
  return (
    req.user.role === 'admin' ||
    req.user.role === 'supervisor' ||
    (await userHasCapability(req.user.sub, ACCESS_WORK_HOURS_CAPABILITY))
  );
}

async function handler(req: AuthedReq, res: ApiRes) {
  if (req.method && req.method.toUpperCase() !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }
  if (!(await canAccess(req))) {
    return sendError(res, 403, 'Forbidden', 'ไม่มีสิทธิ์เข้าถึงข้อมูลชั่วโมงทำงาน');
  }

  try {
    const monthsParam = Number(getString(req.query?.months) ?? '6');
    const months = Number.isFinite(monthsParam) ? Math.min(12, Math.max(1, Math.round(monthsParam))) : 6;

    const buckets = lastMonthBuckets(months, new Date());
    const rangeFrom = buckets[0].from;
    const rangeTo = buckets[buckets.length - 1].to;

    const [{ rows: settingsRows }, { rows: employees }, { rows: holidayRows }] = await Promise.all([
      dbQuery<OtSettingsRow>(`select * from ${otSettingsTbl} where id = true limit 1`, []),
      dbQuery<EmployeeRow>(`select id from ${employeesTbl} where status = 'active'`, []),
      dbQuery<{ holiday_date: string | Date }>(
        `select holiday_date from ${holidaysTbl} where holiday_date >= $1::date and holiday_date <= $2::date`,
        [rangeFrom, rangeTo],
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

    const { rows: bookings } = await dbQuery<BookingRow>(
      `select employee_id, starts_at, completed_at
       from ${bookingsTbl}
       where completed_at is not null and starts_at::date >= $1::date and starts_at::date <= $2::date`,
      [rangeFrom, rangeTo],
    );

    type Acc = { total_hours: number; normal_hours: number; ot_hours: number; ot_cost: number; days: Set<string> };
    const perMonth = buckets.map(() => new Map<string, Acc>());
    const bucketIndexByKey = new Map(buckets.map((b, i) => [b.key, i]));

    for (const employee of employees) {
      for (const accMap of perMonth) {
        accMap.set(employee.id, { total_hours: 0, normal_hours: 0, ot_hours: 0, ot_cost: 0, days: new Set() });
      }
    }

    for (const b of bookings) {
      const startsAt = b.starts_at instanceof Date ? b.starts_at : new Date(b.starts_at);
      const completedAt = b.completed_at instanceof Date ? b.completed_at : new Date(b.completed_at);
      const monthKey = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, '0')}`;
      const bucketIdx = bucketIndexByKey.get(monthKey);
      if (bucketIdx === undefined) continue;
      const acc = perMonth[bucketIdx].get(b.employee_id);
      if (!acc) continue;

      const dateYmd = startsAt.toISOString().slice(0, 10);
      const isHoliday = holidaySet.has(dateYmd);
      const { totalHours, normalHours, otHours } = splitWorkHours(startsAt, completedAt);
      const otCost = otHours * (isHoliday ? otRate3 : otRate15);

      acc.total_hours += totalHours;
      acc.normal_hours += normalHours;
      acc.ot_hours += otHours;
      acc.ot_cost += otCost;
      acc.days.add(dateYmd);
    }

    const trend = buckets.map((bucket, i) => {
      const accMap = perMonth[i];
      let totalHoursAll = 0;
      let totalNormalHoursAll = 0;
      let totalOtHoursAll = 0;
      let totalOtCostAll = 0;
      let activeCount = 0;
      for (const acc of accMap.values()) {
        totalHoursAll += acc.total_hours;
        totalNormalHoursAll += acc.normal_hours;
        totalOtHoursAll += acc.ot_hours;
        totalOtCostAll += acc.ot_cost;
        if (avgHoursPerDay(acc.total_hours, acc.days.size) > threshold) activeCount += 1;
      }
      return {
        month: bucket.key,
        from: bucket.from,
        to: bucket.to,
        total_employees: accMap.size,
        active_count: activeCount,
        idle_count: accMap.size - activeCount,
        total_hours: Math.round(totalHoursAll * 100) / 100,
        total_normal_hours: Math.round(totalNormalHoursAll * 100) / 100,
        total_ot_hours: Math.round(totalOtHoursAll * 100) / 100,
        estimated_ot_cost: Math.round(totalOtCostAll),
      };
    });

    return res.status(200).json({ months, trend });
  } catch (e) {
    return handleApiError(res, e, 'work-hours-trend GET', { userId: req.user.sub });
  }
}

export default withAuth(handler);
