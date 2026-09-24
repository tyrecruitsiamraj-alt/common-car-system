/**
 * แดชบอร์ดสรุปยอดทำข้อสอบรายวันแยกตามประเภท ใช้กับหน้า /exams/results
 * ข้อมูลดิบมาจาก GET /api/fleet-exam-submissions?daily_counts=1 (สรุปฝั่ง DB เป็น 1 แถวต่อ วัน×ประเภทข้อสอบ
 * ไม่ว่าจะมีการส่งข้อสอบจริงกี่พันครั้งก็ตาม — จึงดึงทั้งช่วงเวลาได้โดยไม่ต้อง paginate)
 */

export type ExamDailyCountRow = {
  day: string; // yyyy-MM-dd (วันตามเขตเวลาไทย คำนวณฝั่ง DB)
  exam_key: string;
  exam_title: string;
  /** จำนวนครั้งที่ส่งข้อสอบทั้งหมดในวันนั้น (คนเดียวอาจส่งซ้ำได้) */
  submission_count: number;
  /** จำนวนคนไม่ซ้ำกันที่ทำข้อสอบในวันนั้น (นับจากชื่อผู้ส่ง แบบ trim + ไม่สนตัวพิมพ์เล็ก-ใหญ่) */
  people_count: number;
};

/** รายชื่อ exam_key ที่พบในข้อมูล เรียงตามลำดับที่พบครั้งแรก (คงลำดับเดิม ไม่เรียงตามจำนวน — สีจะได้ไม่สลับตามอันดับ) */
export function listExamKeysInOrder(rows: ExamDailyCountRow[], knownOrder: string[]): string[] {
  const present = new Set(rows.map((r) => r.exam_key));
  const ordered = knownOrder.filter((k) => present.has(k));
  const extra = [...present].filter((k) => !knownOrder.includes(k)).sort();
  return [...ordered, ...extra];
}

export type ExamDailyChartPoint = {
  day: string;
  label: string; // dd/MM แบบสั้นไว้ขึ้นแกน X
} & Record<string, number | string>;

/** เดือน/วันแบบสั้น dd/MM จาก yyyy-MM-dd โดยไม่ผ่าน Date object (กัน timezone เพี้ยน) */
function shortDayLabel(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

/** จัดข้อมูลให้เป็น 1 จุดต่อวัน โดยมีคีย์ของแต่ละประเภทข้อสอบเป็นจำนวนคนในวันนั้น (เติม 0 ให้วันที่ไม่มีข้อมูล) */
export function buildExamDailyChartData(
  rows: ExamDailyCountRow[],
  examKeys: string[],
): ExamDailyChartPoint[] {
  const byDay = new Map<string, ExamDailyChartPoint>();
  for (const r of rows) {
    let point = byDay.get(r.day);
    if (!point) {
      point = { day: r.day, label: shortDayLabel(r.day) };
      for (const k of examKeys) point[k] = 0;
      byDay.set(r.day, point);
    }
    point[r.exam_key] = r.people_count;
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export type ExamDailyTableRow = {
  day: string;
  perExam: Record<string, { people: number; submissions: number }>;
  totalPeople: number;
  totalSubmissions: number;
};

/** จัดข้อมูลเป็นแถวต่อวัน (ใหม่สุดก่อน) พร้อมยอดรวมทุกประเภทข้อสอบต่อวัน — ใช้แสดงในตาราง */
export function buildExamDailyTableRows(rows: ExamDailyCountRow[]): ExamDailyTableRow[] {
  const byDay = new Map<string, ExamDailyTableRow>();
  for (const r of rows) {
    let row = byDay.get(r.day);
    if (!row) {
      row = { day: r.day, perExam: {}, totalPeople: 0, totalSubmissions: 0 };
      byDay.set(r.day, row);
    }
    row.perExam[r.exam_key] = { people: r.people_count, submissions: r.submission_count };
    row.totalPeople += r.people_count;
    row.totalSubmissions += r.submission_count;
  }
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

export type ExamTypeTotal = {
  exam_key: string;
  exam_title: string;
  /** จำนวนครั้งที่ส่งทั้งหมดในช่วงเวลา (ยอดรวมที่ไม่กำกวม — คนเดียวส่งหลายครั้งนับซ้ำได้) */
  totalSubmissions: number;
  /** จำนวนวันในช่วงที่เลือก ที่มีการทำข้อสอบประเภทนี้อย่างน้อย 1 ครั้ง */
  daysWithData: number;
  /** ค่าเฉลี่ยจำนวนคนไม่ซ้ำต่อวัน (เฉพาะวันที่มีข้อมูล) — ไม่ใช่ยอดคนไม่ซ้ำสะสมทั้งช่วง (คนเดียวคนละวันนับซ้ำได้) */
  avgPeoplePerDay: number;
};

/** ยอดรวมทั้งช่วงเวลาต่อประเภทข้อสอบ — ใช้กับ stat tile ด้านบนแดชบอร์ด */
export function buildExamTypeTotals(rows: ExamDailyCountRow[], examKeys: string[]): ExamTypeTotal[] {
  return examKeys.map((key) => {
    const matching = rows.filter((r) => r.exam_key === key);
    const daysWithData = matching.length;
    const peopleSum = matching.reduce((sum, r) => sum + r.people_count, 0);
    return {
      exam_key: key,
      exam_title: matching[0]?.exam_title ?? key,
      totalSubmissions: matching.reduce((sum, r) => sum + r.submission_count, 0),
      daysWithData,
      avgPeoplePerDay: daysWithData > 0 ? Math.round((peopleSum / daysWithData) * 10) / 10 : 0,
    };
  });
}
