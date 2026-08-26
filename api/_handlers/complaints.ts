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

const tbl = tableInAppSchema('complaints');

const DEFAULT_LIST_LIMIT = 2000;
const MAX_LIST_LIMIT = 2000;

/** ฟิลด์ทางเลือกทั้งหมด (ไม่รวม complaint_date/driver_name ที่จำเป็น) — ใช้ทั้ง insert และ update */
const OPTIONAL_FIELDS = [
  'customer_account',
  'employee_id',
  'years_of_service',
  'employee_age',
  'category',
  'complaint_type',
  'complaint_details',
  'position',
  'root_cause',
  'penalty',
  'occurrence_count',
  'corrective_action',
  'employee_status',
  'case_type',
  'reporter_name',
  'reporter_phone',
] as const;

type Row = {
  id: string;
  complaint_date: string | Date;
  driver_name: string;
  customer_account: string | null;
  employee_id: string | null;
  years_of_service: string | null;
  employee_age: string | null;
  category: string | null;
  complaint_type: string | null;
  complaint_details: string | null;
  position: string | null;
  root_cause: string | null;
  penalty: string | null;
  occurrence_count: string | null;
  corrective_action: string | null;
  employee_status: string | null;
  case_type: string | null;
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
    complaint_date: toYmd(row.complaint_date),
    driver_name: row.driver_name,
    customer_account: row.customer_account ?? undefined,
    employee_id: row.employee_id ?? undefined,
    years_of_service: row.years_of_service ?? undefined,
    employee_age: row.employee_age ?? undefined,
    category: row.category ?? undefined,
    complaint_type: row.complaint_type ?? undefined,
    complaint_details: row.complaint_details ?? undefined,
    position: row.position ?? undefined,
    root_cause: row.root_cause ?? undefined,
    penalty: row.penalty ?? undefined,
    occurrence_count: row.occurrence_count ?? undefined,
    corrective_action: row.corrective_action ?? undefined,
    employee_status: row.employee_status ?? undefined,
    case_type: row.case_type ?? undefined,
    reporter_name: row.reporter_name ?? undefined,
    reporter_phone: row.reporter_phone ?? undefined,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

/** yyyy-mm-dd หรือ ISO — ปฏิเสธค่าที่ parse เป็นวันที่ไม่ได้ */
function parseComplaintDate(v: unknown): string | null {
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
      `select * from ${tbl} order by complaint_date desc, created_at desc limit $1 offset $2`,
      [limit, offset],
    );
    const { rows: countRows } = await dbQuery<{ count: number }>(`select count(*)::int as count from ${tbl}`);
    res.setHeader?.('X-Total-Count', String(countRows[0]?.count ?? rows.length));
    return res.status(200).json(rows.map(toPublicRow));
  } catch (e) {
    return handleApiError(res, e, 'complaints GET');
  }
}

async function handlePost(req: ApiReq, res: ApiRes): Promise<void> {
  if (!enforceRateLimit(req, res, 'complaint-report')) return;

  try {
    const raw = await readJsonBody(req);
    if (typeof raw !== 'object' || raw === null) {
      return sendError(res, 400, 'Bad request', 'Invalid JSON body');
    }
    const b = raw as Record<string, unknown>;

    const complaint_date = parseComplaintDate(b.complaint_date);
    const driver_name = getString(b.driver_name);
    if (!complaint_date) return sendError(res, 400, 'Bad request', 'complaint_date invalid or required');
    if (!driver_name) return sendError(res, 400, 'Bad request', 'driver_name required');

    const values = OPTIONAL_FIELDS.map((f) => getString(b[f]));

    const { rows } = await dbQuery<Row>(
      `
      insert into ${tbl} (
        complaint_date, driver_name, ${OPTIONAL_FIELDS.join(', ')}
      )
      values (
        $1::date, $2, ${OPTIONAL_FIELDS.map((_, i) => `$${i + 3}`).join(', ')}
      )
      returning *
      `,
      [complaint_date, driver_name, ...values],
    );

    const row = rows[0];
    if (!row) return sendError(res, 500, 'Failed to save complaint');
    return res.status(201).json(toPublicRow(row));
  } catch (e) {
    return handleApiError(res, e, 'complaints POST');
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

    let complaint_date = toYmd(cur.complaint_date);
    if (b.complaint_date !== undefined) {
      const parsed = parseComplaintDate(b.complaint_date);
      if (!parsed) return sendError(res, 400, 'Bad request', 'complaint_date invalid');
      complaint_date = parsed;
    }

    let driver_name = cur.driver_name;
    if (b.driver_name !== undefined) {
      const name = getString(b.driver_name);
      if (!name) return sendError(res, 400, 'Bad request', 'driver_name required');
      driver_name = name;
    }

    const values = OPTIONAL_FIELDS.map((f) => (b[f] !== undefined ? getString(b[f]) : cur[f]));

    const setClauses = [
      'complaint_date = $2::date',
      'driver_name = $3',
      ...OPTIONAL_FIELDS.map((f, i) => `${f} = $${i + 4}`),
      'updated_at = now()',
    ];

    const { rows } = await dbQuery<Row>(
      `
      update ${tbl} set ${setClauses.join(', ')}
      where id = $1::uuid
      returning *
      `,
      [id, complaint_date, driver_name, ...values],
    );

    const row = rows[0];
    if (!row) return sendError(res, 404, 'Not found');
    return res.status(200).json(toPublicRow(row));
  } catch (e) {
    return handleApiError(res, e, 'complaints PATCH');
  }
}

const protectedGet = withAuthStaffWrite(handleGet);
const protectedPatch = withAuthStaffWrite(handlePatch);

export default async function complaintsHandler(req: ApiReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'POST') return handlePost(req, res);
  if (method === 'GET') return protectedGet(req, res);
  if (method === 'PATCH') return protectedPatch(req, res);
  return sendError(res, 405, 'Method not allowed');
}
