import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatYmdDmyCe } from '@/lib/dateTh';

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? parseISO(d) : d;
}

/** "ตอนนี้" อิงเวลาประเทศไทย (Asia/Bangkok) เสมอ ไม่ว่าเครื่อง/เบราว์เซอร์จะตั้งโซนเวลาใดไว้ */
export function nowInBangkok(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
}

/** วันที่แบบย่อ เช่น 1 ต.ค. 2026 */
export function formatThaiDateShort(d: Date | string): string {
  const date = toDate(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return format(date, 'd MMM yyyy', { locale: th });
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

/** จาก yyyy-MM-dd — วัน/เดือน/ปี ค.ศ. */
export function formatThaiDateFromYmd(ymd: string): string {
  return formatYmdDmyCe(ymd) || ymd;
}
