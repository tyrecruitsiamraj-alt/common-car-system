import { dbQuery } from '../_lib/postgres.js';
import { getTokenFromReq, getTokenFromAuthHeader, verifyAuthToken } from '../_lib/auth.js';
import { sendError, handleApiError, type ApiReq, type ApiRes } from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import { scoreExamAnswers } from '../_lib/fleetExamScoring.js';

const tbl = tableInAppSchema('fleet_exam_submissions');

const VALID_EXAM_KEYS = new Set([
  'start_work_sticker_single',
  'fuel_refill',
  'daily_driver_check',
]);

const EXAM_TITLES: Record<string, string> = {
  start_work_sticker_single: 'บันทึกการตรวจสภาพรถ (ประจำตำแหน่ง)',
  fuel_refill: 'บันทึกการเติมน้ำมัน',
  daily_driver_check: 'Daily Driver Check Sheet',
};

let tableReady: boolean | null = null;

type Row = {
  id: string;
  exam_key: string;
  answers: Record<string, string> | string;
  submitter_name: string | null;
  vehicle_plate: string | null;
  user_id: string | null;
  user_email: string | null;
  score_correct: number | null;
  score_total: number | null;
  score_percent: number | null;
  passed: boolean | null;
  created_at: string | Date;
};

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
        score_correct int null,
        score_total int null,
        score_percent int null,
        passed boolean null,
        created_at timestamptz not null default now()
      )
    `);
    await dbQuery(
      `alter table ${tbl}
        add column if not exists score_correct int null,
        add column if not exists score_total int null,
        add column if not exists score_percent int null,
        add column if not exists passed boolean null`,
    ).catch(() => undefined);
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

function parseRowAnswers(raw: Row['answers']): Record<string, string> {
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown;
      return answersObject(j) ?? {};
    } catch {
      return {};
    }
  }
  return answersObject(raw) ?? {};
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toPublicRow(row: Row) {
  const answers = parseRowAnswers(row.answers);
  return {
    id: row.id,
    exam_key: row.exam_key,
    exam_title: EXAM_TITLES[row.exam_key] ?? row.exam_key,
    submitter_name: row.submitter_name ?? undefined,
    vehicle_plate: row.vehicle_plate ?? undefined,
    score_correct: row.score_correct ?? 0,
    score_total: row.score_total ?? 0,
    score_percent: row.score_percent ?? 0,
    passed: row.passed === true,
    created_at: toIso(row.created_at),
    answers,
  };
}

async function handleGet(req: ApiReq, res: ApiRes): Promise<void> {
  if (!(await ensureFleetExamSubmissionsTable())) {
    return sendError(res, 503, 'Schema not ready', 'ยังไม่มีตาราง fleet_exam_submissions');
  }

  const id = getString(req.query?.id);
  const submitterName = getString(req.query?.submitter_name);
  const vehiclePlate = getString(req.query?.vehicle_plate);
  const examKey = getString(req.query?.exam_key);
  const recent = getString(req.query?.recent);

  try {
    if (id) {
      const { rows } = await dbQuery<Row>(`select * from ${tbl} where id = $1::uuid limit 1`, [id]);
      const row = rows[0];
      if (!row) return res.status(200).json([]);
      return res.status(200).json([toPublicRow(row)]);
    }

    if (recent && !submitterName && !vehiclePlate) {
      const limit = Math.min(50, Math.max(1, parseInt(recent, 10) || 30));
      const params: unknown[] = [limit];
      let sql = `select * from ${tbl}`;
      if (examKey && VALID_EXAM_KEYS.has(examKey)) {
        params.push(examKey);
        sql += ` where exam_key = $${params.length}`;
      }
      sql += ` order by created_at desc limit $1`;
      const { rows } = await dbQuery<Row>(sql, params);
      return res.status(200).json(rows.map(toPublicRow));
    }

    if (!submitterName && !vehiclePlate) {
      return sendError(res, 400, 'Bad request', 'submitter_name, vehicle_plate, or id required');
    }

    const params: unknown[] = [];
    const where: string[] = [];
    if (submitterName) {
      params.push(`%${submitterName}%`);
      where.push(`submitter_name ilike $${params.length}`);
    }
    if (vehiclePlate) {
      params.push(`%${vehiclePlate}%`);
      where.push(`vehicle_plate ilike $${params.length}`);
    }
    if (examKey && VALID_EXAM_KEYS.has(examKey)) {
      params.push(examKey);
      where.push(`exam_key = $${params.length}`);
    }
    params.push(30);
    const { rows } = await dbQuery<Row>(
      `select * from ${tbl} where ${where.join(' and ')} order by created_at desc limit $${params.length}`,
      params,
    );
    return res.status(200).json(rows.map(toPublicRow));
  } catch (e) {
    return handleApiError(res, e, 'fleet-exam-submissions GET');
  }
}

async function handlePost(req: ApiReq, res: ApiRes): Promise<void> {
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

    const score = scoreExamAnswers(exam_key, answers);
    const submitter_name = getString(b.submitter_name) || answers.driver_name || null;
    const vehicle_plate = getString(b.vehicle_plate) || answers.plate || null;
    const { userId, userEmail } = optionalUser(req);

    const { rows } = await dbQuery<Row>(
      `
      insert into ${tbl} (
        exam_key, answers, submitter_name, vehicle_plate, user_id, user_email,
        score_correct, score_total, score_percent, passed
      )
      values ($1, $2::jsonb, $3, $4, $5::uuid, $6, $7, $8, $9, $10)
      returning *
    `,
      [
        exam_key,
        JSON.stringify(answers),
        submitter_name,
        vehicle_plate,
        userId,
        userEmail,
        score.correct,
        score.total,
        score.percent,
        score.passed,
      ],
    );

    const row = rows[0];
    if (!row) return sendError(res, 500, 'Failed to save submission');
    return res.status(201).json(toPublicRow(row));
  } catch (e) {
    return handleApiError(res, e, 'fleet-exam-submissions POST');
  }
}

async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET') return handleGet(req, res);
  if (method === 'POST') return handlePost(req, res);
  return sendError(res, 405, 'Method not allowed');
}

export default handler;
