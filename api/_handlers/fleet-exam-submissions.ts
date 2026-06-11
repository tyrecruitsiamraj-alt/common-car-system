import { dbQuery } from '../_lib/postgres.js';
import { getTokenFromReq, getTokenFromAuthHeader, verifyAuthToken } from '../_lib/auth.js';
import { sendError, handleApiError, type ApiReq, type ApiRes } from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';

const tbl = tableInAppSchema('fleet_exam_submissions');

const VALID_EXAM_KEYS = new Set([
  'start_work_sticker_single',
  'fuel_refill',
  'daily_driver_check',
]);

let tableReady: boolean | null = null;

async function ensureFleetExamSubmissionsTable(): Promise<boolean> {
  if (tableReady) return true;
  try {
    await dbQuery(`
      create table if not exists ${tbl} (
        id uuid primary key default gen_random_uuid(),
        exam_key text not null,
        answers jsonb not null default '{}'::jsonb,
        submitter_name text null,
        vehicle_plate text null,
        user_id uuid null,
        user_email text null,
        created_at timestamptz not null default now()
      )
    `);
    await dbQuery(
      `create index if not exists fleet_exam_submissions_exam_key_idx on ${tbl} (exam_key, created_at desc)`,
    ).catch(() => undefined);
    tableReady = true;
    return true;
  } catch {
    tableReady = false;
    return false;
  }
}

function optionalUser(req: ApiReq): { userId: string | null; userEmail: string | null } {
  const token = getTokenFromReq(req) || getTokenFromAuthHeader(req);
  if (!token) return { userId: null, userEmail: null };
  try {
    const user = verifyAuthToken(token);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return {
      userId: uuidRe.test(user.sub) ? user.sub : null,
      userEmail: user.email?.trim() || null,
    };
  } catch {
    return { userId: null, userEmail: null };
  }
}

function answersObject(v: unknown): Record<string, string> | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof k !== 'string' || !k.trim()) continue;
    if (val == null) continue;
    const s = String(val).trim();
    if (s) out[k.trim()] = s;
  }
  return out;
}

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    if (!(await ensureFleetExamSubmissionsTable())) {
      return sendError(res, 503, 'Schema not ready', 'ยังไม่มีตาราง fleet_exam_submissions — รัน npm run db:migrate');
    }

    const raw = await readJsonBody(req);
    if (typeof raw !== 'object' || raw === null) {
      return sendError(res, 400, 'Bad request', 'Invalid JSON body');
    }
    const b = raw as Record<string, unknown>;
    const exam_key = getString(b.exam_key);
    if (!exam_key || !VALID_EXAM_KEYS.has(exam_key)) {
      return sendError(res, 400, 'Bad request', 'exam_key invalid');
    }

    const answers = answersObject(b.answers);
    if (!answers || Object.keys(answers).length === 0) {
      return sendError(res, 400, 'Bad request', 'answers required');
    }

    const submitter_name = getString(b.submitter_name) || answers.driver_name || null;
    const vehicle_plate = getString(b.vehicle_plate) || answers.plate || null;
    const { userId, userEmail } = optionalUser(req);

    const { rows } = await dbQuery<{ id: string; created_at: string | Date }>(
      `
      insert into ${tbl} (exam_key, answers, submitter_name, vehicle_plate, user_id, user_email)
      values ($1, $2::jsonb, $3, $4, $5::uuid, $6)
      returning id, created_at
    `,
      [
        exam_key,
        JSON.stringify(answers),
        submitter_name,
        vehicle_plate,
        userId,
        userEmail,
      ],
    );

    const row = rows[0];
    if (!row) return sendError(res, 500, 'Failed to save submission');

    const created =
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
    return res.status(201).json({ id: row.id, exam_key, created_at: created });
  } catch (e) {
    return handleApiError(res, e, 'fleet-exam-submissions POST');
  }
}
