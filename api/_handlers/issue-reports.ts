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
import { logWarn } from '../_lib/logger.js';

const tbl = tableInAppSchema('issue_reports');

const KNOWN_CATEGORIES = ['vehicle-service', 'supervisor-absent', 'leave', 'speed'] as const;

const DEFAULT_LIST_LIMIT = 2000;
const MAX_LIST_LIMIT = 2000;

type Row = {
  id: string;
  category: string;
  report_date: string | Date | null;
  employee_id: string | null;
  employee_name: string | null;
  position: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  data: Record<string, unknown> | null;
  created_at: string | Date;
  // คอลัมน์จาก migration 043 — อาจยังไม่มีในฐานข้อมูลจริงจนกว่าจะรัน migration
  related_accident?: boolean | null;
  accident_case_id?: string | null;
};

function getBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

function toYmd(value: string | Date | null): string | undefined {
  if (!value) return undefined;
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
    category: row.category,
    report_date: toYmd(row.report_date),
    employee_id: row.employee_id ?? undefined,
    employee_name: row.employee_name ?? undefined,
    position: row.position ?? undefined,
    reporter_name: row.reporter_name ?? undefined,
    reporter_phone: row.reporter_phone ?? undefined,
    data: row.data ?? {},
    created_at: toIso(row.created_at),
    related_accident: row.related_accident ?? false,
    accident_case_id: row.accident_case_id ?? undefined,
  };
}

function parseDate(v: unknown): string | null {
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
    const category = getString(req.query?.category);

    const where = category ? 'where category = $3' : '';
    const params: unknown[] = category ? [limit, offset, category] : [limit, offset];

    const { rows } = await dbQuery<Row>(
      `select * from ${tbl} ${where} order by report_date desc nulls last, created_at desc limit $1 offset $2`,
      params,
    );
    return res.status(200).json(rows.map(toPublicRow));
  } catch (e) {
    return handleApiError(res, e, 'issue-reports GET');
  }
}

async function handlePost(req: ApiReq, res: ApiRes): Promise<void> {
  if (!enforceRateLimit(req, res, 'issue-report')) return;

  try {
    const raw = await readJsonBody(req);
    if (typeof raw !== 'object' || raw === null) {
      return sendError(res, 400, 'Bad request', 'Invalid JSON body');
    }
    const b = raw as Record<string, unknown>;

    const category = getString(b.category);
    if (!category || !(KNOWN_CATEGORIES as readonly string[]).includes(category)) {
      return sendError(res, 400, 'Bad request', 'category invalid or required');
    }

    const report_date = parseDate(b.report_date);
    const employee_id = getString(b.employee_id);
    const employee_name = getString(b.employee_name);
    const position = getString(b.position);
    const reporter_name = getString(b.reporter_name);
    const reporter_phone = getString(b.reporter_phone);
    const data = typeof b.data === 'object' && b.data !== null ? b.data : {};

    const { rows } = await dbQuery<Row>(
      `
      insert into ${tbl} (
        category, report_date, employee_id, employee_name, position, reporter_name, reporter_phone, data
      )
      values ($1, $2::date, $3, $4, $5, $6, $7, $8::jsonb)
      returning *
      `,
      [category, report_date, employee_id, employee_name, position, reporter_name, reporter_phone, JSON.stringify(data)],
    );

    let row = rows[0];
    if (!row) return sendError(res, 500, 'Failed to save report');

    const related_accident = getBool(b.related_accident);
    const accident_case_id = getString(b.accident_case_id);
    if (related_accident !== undefined || accident_case_id) {
      try {
        const { rows: accRows } = await dbQuery<Row>(
          `update ${tbl} set related_accident = coalesce($2, related_accident), accident_case_id = $3 where id = $1 returning *`,
          [row.id, related_accident ?? null, accident_case_id],
        );
        if (accRows[0]) row = accRows[0];
      } catch (accErr) {
        // ป้องกัน: ถ้ายังไม่ได้รัน migration 043 (คอลัมน์ related_accident/accident_case_id ยังไม่มี)
        // อย่าให้การบันทึกเคสหลักพังตาม
        logWarn('issue-reports POST - accident link skipped (migration 043 not applied?)', {
          message: accErr instanceof Error ? accErr.message : String(accErr),
        });
      }
    }

    return res.status(201).json(toPublicRow(row));
  } catch (e) {
    return handleApiError(res, e, 'issue-reports POST');
  }
}

async function handlePatch(req: AuthedReq, res: ApiRes): Promise<void> {
  try {
    const id = getString(req.query?.id);
    if (!id) return sendError(res, 400, 'Bad request', 'id is required');

    const raw = await readJsonBody(req);
    if (typeof raw !== 'object' || raw === null) {
      return sendError(res, 400, 'Bad request', 'Invalid JSON body');
    }
    const b = raw as Record<string, unknown>;

    const related_accident = getBool(b.related_accident);
    const hasAccidentCaseId = Object.prototype.hasOwnProperty.call(b, 'accident_case_id');
    const accident_case_id = hasAccidentCaseId ? getString(b.accident_case_id) : undefined;

    if (related_accident === undefined && accident_case_id === undefined) {
      return sendError(res, 400, 'Bad request', 'Nothing to update');
    }

    try {
      const { rows } = await dbQuery<Row>(
        `update ${tbl} set
          related_accident = coalesce($2, related_accident),
          accident_case_id = case when $3 then $4 else accident_case_id end
        where id = $1
        returning *`,
        [id, related_accident ?? null, hasAccidentCaseId, accident_case_id ?? null],
      );
      const row = rows[0];
      if (!row) return sendError(res, 404, 'Not found');
      return res.status(200).json(toPublicRow(row));
    } catch (e) {
      // ป้องกัน: ถ้ายังไม่ได้รัน migration 043 ให้ตอบข้อความที่เข้าใจง่าย แทนที่จะพัง 500 ดิบๆ
      logWarn('issue-reports PATCH - accident columns unavailable (migration 043 not applied?)', {
        message: e instanceof Error ? e.message : String(e),
      });
      return sendError(res, 409, 'ยังไม่สามารถบันทึกได้ — ระบบยังไม่ได้อัปเดตฐานข้อมูลสำหรับฟีเจอร์นี้ กรุณาติดต่อผู้ดูแลระบบ');
    }
  } catch (e) {
    return handleApiError(res, e, 'issue-reports PATCH');
  }
}

const protectedGet = withAuthStaffWrite(handleGet);
const protectedPatch = withAuthStaffWrite(handlePatch);

export default async function issueReportsHandler(req: ApiReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'POST') return handlePost(req, res);
  if (method === 'GET') return protectedGet(req, res);
  if (method === 'PATCH') return protectedPatch(req, res);
  return sendError(res, 405, 'Method not allowed');
}
