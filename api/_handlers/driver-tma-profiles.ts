import { dbQuery } from '../_lib/postgres.js';
import { sendError, handleApiError, withAuthDataRoute, type ApiRes, type AuthedReq } from '../_lib/http.js';
import { getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';

const tbl = tableInAppSchema('driver_tma_profiles');

/**
 * ข้อมูลเสริมของคนขับจาก "Database TMA.xlsx" (Toyota Motor Asia) — อ่านอย่างเดียว
 * (ข้อมูลนี้ import เข้าเป็นชุดผ่าน scripts/import-tma-driver-profiles.mjs ไม่ได้แก้ผ่าน UI)
 * ใช้แสดงเสริมในหน้ารายละเอียดผู้ขับ (`/fleet/drivers/:id`)
 */

type Row = {
  id: string;
  employee_id: string | null;
  tma_driver_code: string | null;
  driver_name_eng: string | null;
  driver_name_th: string | null;
  driver_tel: string | null;
  line_id: string | null;
  site: string | null;
  sub_site: string | null;
  tma_status: string | null;
  start_date: string | Date | null;
  end_date: string | Date | null;
  resignation_reason: string | null;
  experience_years: string | number | null;
  driver_type: string | null;
  under_driver_co: string | null;
  boss_type: string | null;
  assigned_user_name: string | null;
  assigned_user_tel: string | null;
  apartment: string | null;
  car_model: string | null;
  car_color: string | null;
  car_no: string | null;
  car_sticker: string | null;
  driver_movement: string | null;
  car_movement: string | null;
  driver_picture_url: string | null;
  driver_license_image_url: string | null;
  defensive_safety_driving: string | null;
  tdem_card_id: string | null;
  card_last5: string | null;
  birthdate: string | Date | null;
  age: string | number | null;
  english_first_name: string | null;
  english_last_name: string | null;
  exam_score_2025: string | number | null;
  supervisor_score_2025: string | number | null;
  complain_score: string | number | null;
  accident_score: string | number | null;
  total_score: string | number | null;
  source_file: string | null;
  imported_at: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
};

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

function toNum(value: string | number | null): number | undefined {
  if (value === null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toPublicRow(row: Row) {
  return {
    id: row.id,
    employee_id: row.employee_id ?? undefined,
    tma_driver_code: row.tma_driver_code ?? undefined,
    driver_name_eng: row.driver_name_eng ?? undefined,
    driver_name_th: row.driver_name_th ?? undefined,
    driver_tel: row.driver_tel ?? undefined,
    line_id: row.line_id ?? undefined,
    site: row.site ?? undefined,
    sub_site: row.sub_site ?? undefined,
    tma_status: row.tma_status ?? undefined,
    start_date: toYmd(row.start_date),
    end_date: toYmd(row.end_date),
    resignation_reason: row.resignation_reason ?? undefined,
    experience_years: toNum(row.experience_years),
    driver_type: row.driver_type ?? undefined,
    under_driver_co: row.under_driver_co ?? undefined,
    boss_type: row.boss_type ?? undefined,
    assigned_user_name: row.assigned_user_name ?? undefined,
    assigned_user_tel: row.assigned_user_tel ?? undefined,
    apartment: row.apartment ?? undefined,
    car_model: row.car_model ?? undefined,
    car_color: row.car_color ?? undefined,
    car_no: row.car_no ?? undefined,
    car_sticker: row.car_sticker ?? undefined,
    driver_movement: row.driver_movement ?? undefined,
    car_movement: row.car_movement ?? undefined,
    driver_picture_url: row.driver_picture_url ?? undefined,
    driver_license_image_url: row.driver_license_image_url ?? undefined,
    defensive_safety_driving: row.defensive_safety_driving ?? undefined,
    tdem_card_id: row.tdem_card_id ?? undefined,
    card_last5: row.card_last5 ?? undefined,
    birthdate: toYmd(row.birthdate),
    age: toNum(row.age),
    english_first_name: row.english_first_name ?? undefined,
    english_last_name: row.english_last_name ?? undefined,
    exam_score_2025: toNum(row.exam_score_2025),
    supervisor_score_2025: toNum(row.supervisor_score_2025),
    complain_score: toNum(row.complain_score),
    accident_score: toNum(row.accident_score),
    total_score: toNum(row.total_score),
    source_file: row.source_file ?? undefined,
    imported_at: toIso(row.imported_at),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

async function handler(req: AuthedReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') return sendError(res, 405, 'Method not allowed');

  try {
    const employeeId = getString(req.query?.employee_id);
    if (employeeId) {
      const { rows } = await dbQuery<Row>(
        `select * from ${tbl} where employee_id = $1 limit 1`,
        [employeeId],
      );
      if (rows.length === 0) return sendError(res, 404, 'Not found', 'Driver TMA profile not found');
      return res.status(200).json(toPublicRow(rows[0]));
    }

    const id = getString(req.query?.id);
    if (id) {
      const { rows } = await dbQuery<Row>(`select * from ${tbl} where id = $1 limit 1`, [id]);
      if (rows.length === 0) return sendError(res, 404, 'Not found', 'Driver TMA profile not found');
      return res.status(200).json(toPublicRow(rows[0]));
    }

    const { rows } = await dbQuery<Row>(`select * from ${tbl} order by driver_name_th limit 2000`);
    return res.status(200).json(rows.map(toPublicRow));
  } catch (e) {
    return handleApiError(res, e, 'driver-tma-profiles GET', { userId: req.user.sub });
  }
}

export default withAuthDataRoute(handler);
