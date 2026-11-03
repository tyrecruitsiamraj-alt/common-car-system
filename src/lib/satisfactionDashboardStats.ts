import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { monthKey } from '@/lib/caseReportStats';
import type { IssueReportRow } from '@/lib/issueReportStats';

/** ต้องตรงกับ handler ฝั่ง backend ของสิทธิ์นี้ — ควบคุมว่าใครเห็นเมนู Dashboard ความพึงพอใจได้บ้าง (เหมือน ACCESS_WORK_HOURS_CAPABILITY) */
export const ACCESS_SATISFACTION_DASHBOARD_CAPABILITY = 'access_satisfaction_dashboard';

/** เกณฑ์มาตรฐาน — คะแนนตั้งแต่นี้ขึ้นไปถือว่า "ดี" ขึ้นไป ใช้เป็นเส้นเกณฑ์ในกราฟแนวโน้ม */
export const GOOD_SCORE_THRESHOLD = 4;
/** คะแนนตั้งแต่นี้ลงมาถือว่า "ควรปรับปรุง" */
const POOR_SCORE_THRESHOLD = 2;

export const SATISFACTION_CRITERIA = [
  { key: 'courtesy_score', label: 'ความสุภาพและบริการ' },
  { key: 'safety_score', label: 'ความปลอดภัยในการขับขี่' },
  { key: 'cleanliness_score', label: 'ความสะอาดของรถ' },
  { key: 'punctuality_score', label: 'การตรงต่อเวลา' },
] as const;

export type SatisfactionCriterionKey = (typeof SATISFACTION_CRITERIA)[number]['key'];

/** ดึงตัวเลขคะแนนนำหน้าจากค่าที่เก็บไว้ เช่น "5 - ดีเยี่ยม (Excellent)" -> 5 */
export function parseScore(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const m = /^(\d+)/.exec(raw.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100;
}

/** คะแนนรวมเฉลี่ยของ 1 แถว (เฉลี่ย 4 หัวข้อที่ตอบ) */
function rowOverallScore(row: IssueReportRow): number | null {
  const scores = SATISFACTION_CRITERIA.map((c) => parseScore(row.data[c.key])).filter((n): n is number => n !== null);
  return average(scores);
}

export type CriterionAverage = {
  key: SatisfactionCriterionKey;
  label: string;
  average: number | null;
  count: number;
};

export type ScoreDistributionPoint = { score: number; label: string; count: number };

export type SatisfactionStats = {
  total: number;
  overallAverage: number | null;
  criteriaAverages: CriterionAverage[];
  goodPercent: number;
  poorPercent: number;
  distinctDrivers: number;
};

export function computeSatisfactionStats(rows: IssueReportRow[]): SatisfactionStats {
  const criteriaAverages: CriterionAverage[] = SATISFACTION_CRITERIA.map((c) => {
    const scores = rows.map((r) => parseScore(r.data[c.key])).filter((n): n is number => n !== null);
    return { key: c.key, label: c.label, average: average(scores), count: scores.length };
  });

  const overallScores = rows.map(rowOverallScore).filter((n): n is number => n !== null);
  const goodCount = overallScores.filter((s) => s >= GOOD_SCORE_THRESHOLD).length;
  const poorCount = overallScores.filter((s) => s <= POOR_SCORE_THRESHOLD).length;

  return {
    total: rows.length,
    overallAverage: average(overallScores),
    criteriaAverages,
    goodPercent: overallScores.length > 0 ? Math.round((goodCount / overallScores.length) * 1000) / 10 : 0,
    poorPercent: overallScores.length > 0 ? Math.round((poorCount / overallScores.length) * 1000) / 10 : 0,
    distinctDrivers: new Set(rows.map((r) => (r.data.driver_name ?? '').trim()).filter(Boolean)).size,
  };
}

/** จำนวนคะแนน 1-5 ของแต่ละหัวข้อ — ใช้ทำกราฟกระจายคะแนน */
export function computeScoreDistribution(rows: IssueReportRow[], key: SatisfactionCriterionKey): ScoreDistributionPoint[] {
  const counts = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  for (const row of rows) {
    const score = parseScore(row.data[key]);
    if (score !== null) counts.set(score, (counts.get(score) ?? 0) + 1);
  }
  return [5, 4, 3, 2, 1].map((score) => ({ score, label: `${score} คะแนน`, count: counts.get(score) ?? 0 }));
}

export type CriteriaDistributionPoint = { criterion: string; 5: number; 4: number; 3: number; 2: number; 1: number };

/** จำนวนคะแนน 1-5 ของทั้ง 4 หัวข้อ รวมในชุดเดียว — ใช้ทำกราฟแท่งซ้อนเปรียบเทียบการกระจายคะแนนของแต่ละหัวข้อ */
export function buildCriteriaDistribution(rows: IssueReportRow[]): CriteriaDistributionPoint[] {
  return SATISFACTION_CRITERIA.map((c) => {
    const dist = computeScoreDistribution(rows, c.key);
    const point = { criterion: c.label } as CriteriaDistributionPoint;
    for (const d of dist) point[d.score as 1 | 2 | 3 | 4 | 5] = d.count;
    return point;
  });
}

export type SatisfactionTrendPoint = {
  month: string;
  label: string;
  count: number;
  overallAverage: number | null;
} & Record<SatisfactionCriterionKey, number | null>;

/** แนวโน้มคะแนนเฉลี่ยรายเดือน N เดือนล่าสุด (รวมเดือนปัจจุบัน) แยกตามหัวข้อ + ค่าเฉลี่ยรวม */
export function buildSatisfactionMonthlyTrend(rows: IssueReportRow[], months = 6): SatisfactionTrendPoint[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const byMonth = new Map<string, IssueReportRow[]>();
  for (const row of rows) {
    if (!row.report_date) continue;
    const key = monthKey(row.report_date);
    const bucket = byMonth.get(key) ?? [];
    bucket.push(row);
    byMonth.set(key, bucket);
  }

  return keys.map((key) => {
    const [y, m] = key.split('-');
    const label = format(new Date(Number(y), Number(m) - 1, 1), 'MMM yy', { locale: th });
    const monthRows = byMonth.get(key) ?? [];
    const criteriaValues = Object.fromEntries(
      SATISFACTION_CRITERIA.map((c) => [
        c.key,
        average(monthRows.map((r) => parseScore(r.data[c.key])).filter((n): n is number => n !== null)),
      ]),
    ) as Record<SatisfactionCriterionKey, number | null>;
    const overallAverage = average(monthRows.map(rowOverallScore).filter((n): n is number => n !== null));
    return { month: key, label, count: monthRows.length, overallAverage, ...criteriaValues };
  });
}

/** เลเบลระดับคะแนนตามเกณฑ์ที่ประกาศไว้ในแบบฟอร์ม — ใช้สรุปผลให้อ่านง่าย */
export function scoreGradeLabel(score: number | null): string {
  if (score === null) return 'ไม่มีข้อมูล';
  if (score >= 4.5) return 'ดีเยี่ยม (Excellent)';
  if (score >= 3.5) return 'ดี (Good)';
  if (score >= 2.5) return 'ปานกลาง/พอใช้ (Fair)';
  if (score >= 1.5) return 'ควรปรับปรุง (Poor)';
  return 'ปรับปรุงเร่งด่วน (Very Poor)';
}
