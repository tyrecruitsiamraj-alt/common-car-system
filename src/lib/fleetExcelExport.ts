import { format } from 'date-fns';
import { downloadExcelFile } from '@/lib/exportExcel';
import { exportFilenameDateSuffix, type ExportYmdRange } from '@/lib/exportDateRange';
import {
  bookingEffectiveEnd,
  deriveBookingListStatus,
} from '@/lib/fleetBookingsDashboard';
import { BOOKING_STATUS_META } from '@/components/fleet/FleetBookingsDashboard';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
import { formatThaiDate, formatThaiTimeRange } from '@/lib/thaiDateTimeFormat';
import type { Employee, VehicleBooking } from '@/types';
import type {
  DriverBookingRow,
  DriverDestinationStat,
  DriverVehicleUsage,
} from '@/lib/driverBookingHistory';
import { DRIVER_BOOKING_TIMING_LABEL } from '@/lib/driverBookingHistory';

const EMPLOYEE_STATUS_LABEL: Record<Employee['status'], string> = {
  active: 'ใช้งาน',
  inactive: 'ไม่ใช้งาน',
  suspended: 'ระงับ',
};

function stampFilename(prefix: string, dayYmd?: string): string {
  const d = dayYmd ?? format(new Date(), 'yyyy-MM-dd');
  return `${prefix}-${d}`;
}

function stampFilenameRange(prefix: string, range: ExportYmdRange): string {
  return `${prefix}-${exportFilenameDateSuffix(range.fromYmd, range.toYmd)}`;
}

export function exportDriversExcel(employees: Employee[], dayYmd?: string): void {
  const rows = employees.map((e) => ({
    รหัสพนักงาน: e.employee_code,
    คำนำหน้า: e.title_prefix?.trim() ?? '',
    ชื่อ: e.first_name,
    นามสกุล: e.last_name,
    ชื่อเต็ม: formatEmployeeDisplayName(e),
    เบอร์โทร: e.phone,
    สถานะ: EMPLOYEE_STATUS_LABEL[e.status] ?? e.status,
    ตำแหน่ง: e.position,
    วันที่เริ่มงาน: e.join_date,
  }));
  downloadExcelFile(stampFilename('drivers', dayYmd), [{ sheetName: 'Drivers', rows }]);
}

export function exportBookingsExcel(
  bookings: VehicleBooking[],
  empLabel: (id: string) => string,
  vehLabel: (id: string) => string,
  range: ExportYmdRange,
): void {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const rows = sorted.map((b) => {
    const st = deriveBookingListStatus(b);
    const dest = (b.destination || '').trim();
    const note = (b.notes || '').trim();
    return {
      รหัสจอง: b.id,
      ผู้ขับ: empLabel(b.employee_id),
      ทะเบียนรถ: vehLabel(b.vehicle_id),
      วันที่: formatThaiDate(b.starts_at),
      เวลา: formatThaiTimeRange(b.starts_at, bookingEffectiveEnd(b)),
      เริ่ม_ISO: b.starts_at,
      สิ้นสุด_ISO: b.ends_at,
      เสร็จ_ISO: b.completed_at ?? '',
      ปลายทาง: dest || note || '',
      หมายเหตุ: note,
      สถานะ: BOOKING_STATUS_META[st].label,
      สถานะ_DB: b.status === 'cancelled' ? 'ยกเลิก' : 'ใช้งาน',
    };
  });
  downloadExcelFile(stampFilenameRange('bookings', range), [{ sheetName: 'Bookings', rows }]);
}

export function exportDriverProfileExcel(
  employee: Employee,
  jobRows: DriverBookingRow[],
  vehicleUsage: DriverVehicleUsage[],
  destinations: DriverDestinationStat[],
  earlyCount: number,
  lateCount: number,
  range: ExportYmdRange,
): void {
  const base = stampFilenameRange(
    `driver-${employee.employee_code || employee.id.slice(0, 8)}`,
    range,
  );

  downloadExcelFile(base, [
    {
      sheetName: 'ข้อมูลผู้ขับ',
      rows: [
        {
          รหัสพนักงาน: employee.employee_code,
          คำนำหน้า: employee.title_prefix?.trim() ?? '',
          ชื่อ: employee.first_name,
          นามสกุล: employee.last_name,
          เบอร์โทร: employee.phone,
          งานก่อนเวลา: earlyCount,
          งานเกินเวลา: lateCount,
        },
      ],
    },
    {
      sheetName: 'ประวัติงาน',
      rows: jobRows.map(({ booking, timing, destinationLabel, vehicleLabel }) => ({
        วันที่: formatThaiDate(booking.starts_at),
        เวลา: formatThaiTimeRange(booking.starts_at, bookingEffectiveEnd(booking)),
        รถ: vehicleLabel,
        สถานที่: destinationLabel,
        สถานะเวลา: DRIVER_BOOKING_TIMING_LABEL[timing],
        รหัสจอง: booking.id,
      })),
    },
    {
      sheetName: 'ใช้รถ',
      rows: vehicleUsage.map((v) => ({
        รถ: v.label,
        จำนวนครั้ง: v.tripCount,
        ล่าสุด: formatThaiDate(v.lastAt),
      })),
    },
    {
      sheetName: 'สถานที่',
      rows: destinations.map((d) => ({
        สถานที่: d.destination,
        จำนวนครั้ง: d.tripCount,
        ล่าสุด: formatThaiDate(d.lastAt),
      })),
    },
  ]);
}
