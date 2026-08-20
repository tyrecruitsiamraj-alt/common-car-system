import { dbQuery } from '../_lib/postgres.js';
import {
  sendError,
  handleApiError,
  withAuthStaffWrite,
  type ApiReq,
  type ApiRes,
  type AuthedReq,
} from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import { enforceRateLimit } from '../_lib/rateLimit.js';

const tbl = tableInAppSchema('accident_cases');

const DEFAULT_LIST_LIMIT = 2000;
const MAX_LIST_LIMIT = 2000;

/** ฟิลด์ทางเลือกทั้งหมด (ไม่รวม case_date/employee_name ที่จำเป็น) — ใช้ทั้ง insert และ update */
const OPTIONAL_FIELDS = [
  'driver_status',
  'job_type',
  'province',
  'years_of_service',
  'employee_age',
  'case_status',
  'time_range',
  'work_day_type',
  'vehicle_model',
  'case_detail',
  'accident_type',
  'movement_detail',
  'location_name',
  'location_detail',
  'root_cause',
  'cause_detail',
  'penalty',
  'reporter_name',
  'reporter_phone',
] as const;

type Row = {
  id: string;
  case_date: string | Date;
  employee_name: string;
  driver_status: string | null;
  job_type: string | null;
  province: string | null;
  years_of_service: string | null;
  employee_age: string | null;
  case_status: string | null;
  time_range: string | null;
  work_day_type: string | null;
  vehicle_model: string | null;
  case_detail: string | null;
  accident_type: string | null;
  movement_detail: string | null;
  location_name: string | null;
  location_detail: string | null;
  root_cause: string | null;
  cause_detail: string | null;
  penalty: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

/** pg แปลงคอลัมน์ date เป็น Date แบบ local time — ต้องอ่านด้วย local getter ไม่ใช่ toISOString (ไม่งั้นได้วันก่อนหน้าเมื่อ TZ ไม่ใช่ UTC) */
function toYmd(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function toPublicRow(row: Row) {
  return {
    id: row.id,
    case_date: toYmd(row.case_date),
    employee_name: row.employee_name,
    driver_status: row.driver_status ?? undefined,
    job_type: row.job_type ?? undefined,
    province: row.province ?? undefined,
    years_of_service: row.years_of_service ?? undefined,
    employee_age: row.employee_age ?? undefined,
    case_status: row.case_status ?? undefined,
    time_range: row.time_range ?? undefined,
    work_day_type: row.work_day_type ?? undefined,
    vehicle_model: row.vehicle_model ?? undefined,
    case_detail: row.case_detail ?? undefined,
    accident_type: row.accident_type ?? undefined,
    movement_detail: row.movement_detail ?? undefined,
    location_name: row.location_name ?? undefined,
    location_detail: row.location_detail ?? undefined,
    root_cause: row.root_cause ?? undefined,
    cause_detail: row.cause_detail ?? undefined,
    penalty: row.penalty ?? undefined,
    reporter_name: row.reporter_name ?? undefined,
    reporter_phone: row.reporter_phone ?? undefined,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

/** yyyy-mm-dd หรือ ISO — ปฏิเสธค่าที่ parse เป็นวันที่ไม่ได้ */
function parseCaseDate(v: unknown): string | null {
  const s = getString(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseLimitOffset(query: Record<string, unknown> | undefined): { limit: number; offset: number } {
  const rawLimit = getString(query?.limit);
  const rawOffset = getString(query?.offset);
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number.parseInt(rawLimit ?? '', 10) || DEFAULT_LIST_LIMIT));
  const offset = Math.max(0, Number.parseInt(rawOffset ?? '', 10) || 0);
  return { limit, offset };
}

async function handleGet(req: AuthedReq, res: ApiRes): Promise<void> {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const { rows } = await dbQuery<Row>(
      `select * from ${tbl} order by case_date desc, created_at desc limit $1 offset $2`,
      [limit, offset],
    );
    const { rows: countRows } = await dbQuery<{ count: number }>(`select count(*)::int as count from ${tbl}`);
    res.setHeader?.('X-Total-Count', String(countRows[0]?.count ?? rows.length));
    return res.status(200).json(rows.map(toPublicRow));
  } catch (e) {
    return handleApiError(res, e, 'accident-cases GET');
  }
}

async function handlePost(req: ApiReq, res: ApiRes): Promise<void> {
  if (!enforceRateLimit(req, res, 'accident-report')) return;

  try {
    const raw = await readJsonBody(req);
    if (typeof raw !== 'object' || raw === null) {
      return sendError(res, 400, 'Bad request', 'Invalid JSON body');
    }
    const b = raw as Record<string, unknown>;

    const case_date = parseCaseDate(b.case_date);
    const employee_name = getString(b.employee_name);
    if (!case_date) return sendError(res, 400, 'Bad request', 'case_date invalid or required');
    if (!employee_name) return sendError(res, 400, 'Bad request', 'employee_name required');

    const values = OPTIONAL_FIELDS.map((f) => getString(b[f]));

    const { rows } = await dbQuery<Row>(
      `
      insert into ${tbl} (
        case_date, employee_name, ${OPTIONAL_FIELDS.join(', ')}
      )
      values (
        $1::date, $2, ${OPTIONAL_FIELDS.map((_, i) => `$${i + 3}`).join(', ')}
      )
      returning *
      `,
      [case_date, employee_name, ...values],
    );

    const row = rows[0];
    if (!row) return sendError(res, 500, 'Failed to save accident case');
    return res.status(201).json(toPublicRow(row));
  } catch (e) {
    return handleApiError(res, e, 'accident-cases POST');
  }
}

async function handlePatch(req: AuthedReq, res: ApiRes): Promise<void> {
  try {
    const id = getString(req.query?.id);
    if (!id) return sendError(res, 400, 'Bad request', 'query id required');

    const { rows: curRows } = await dbQuery<Row>(`select * from ${tbl} where id = $1::uuid limit 1`, [id]);
    const cur = curRows[0];
    if (!cur) return sendError(res, 404, 'Not found');

    const raw = await readJsonBody(req);
    if (typeof raw !== 'object' || raw === null) {
      return sendError(res, 400, 'Bad request', 'Invalid JSON body');
    }
    const b = raw as Record<string, unknown>;

    let case_date = toYmd(cur.case_date);
    if (b.case_date !== undefined) {
      const parsed = parseCaseDate(b.case_date);
      if (!parsed) return sendError(res, 400, 'Bad request', 'case_date invalid');
      case_date = parsed;
    }

    let employee_name = cur.employee_name;
    if (b.employee_name !== undefined) {
      const name = getString(b.employee_name);
      if (!name) return sendError(res, 400, 'Bad request', 'employee_name required');
      employee_name = name;
    }

    const values = OPTIONAL_FIELDS.map((f) => (b[f] !== undefined ? getString(b[f]) : cur[f]));

    const setClauses = [
      'case_date = $2::date',
      'employee_name = $3',
      ...OPTIONAL_FIELDS.map((f, i) => `${f} = $${i + 4}`),
      'updated_at = now()',
    ];

    const { rows } = await dbQuery<Row>(
      `
      update ${tbl} set ${setClauses.join(', ')}
      where id = $1::uuid
      returning *
      `,
      [id, case_date, employee_name, ...values],
    );

    const row = rows[0];
    if (!row) return sendError(res, 404, 'Not found');
    return res.status(200).json(toPublicRow(row));
  } catch (e) {
    return handleApiError(res, e, 'accident-cases PATCH');
  }
}

const protectedGet = withAuthStaffWrite(handleGet);
const protectedPatch = withAuthStaffWrite(handlePatch);

export default async function accidentCasesHandler(req: ApiReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'POST') return handlePost(req, res);
  if (method === 'GET') return protectedGet(req, res);
  if (method === 'PATCH') return protectedPatch(req, res);
  return sendError(res, 405, 'Method not allowed');
}
