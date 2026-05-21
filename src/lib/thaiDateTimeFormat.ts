import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? parseISO(d) : d;
}

/** วัน/เดือน/ปี เช่น 20/05/2026 */
export function formatThaiDate(d: Date | string): string {
  const date = toDate(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return format(date, 'dd/MM/yyyy', { locale: th });
}

/** เวลา 24 ชม. + น. เช่น 14:30 น. */
export function formatThaiTime(d: Date | string): string {
  const date = toDate(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return `${format(date, 'HH:mm')} น.`;
}

export function formatThaiTimeRange(start: Date | string, end: Date | string): string {
  return `${formatThaiTime(start)} – ${formatThaiTime(end)}`;
}

/** วัน/เดือน/ปี + เวลา น. */
export function formatThaiDateTime(d: Date | string): string {
  return `${formatThaiDate(d)} ${formatThaiTime(d)}`;
}

/** จาก yyyy-MM-dd */
export function formatThaiDateFromYmd(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return ymd;
  return formatThaiDate(dt);
}
