/**
 * ข้อสอบ / แบบบันทึก — ดึงโครงสร้างจาก Microsoft Forms (src/data/fleetExamsFromMsForms.json)
 * อัปเดตข้อมูล: npm run sync:ms-forms-exams
 */
import syncedExams from '@/data/fleetExamsFromMsForms.json';

export type ExamQuestion =
  | {
      id: string;
      type: 'text';
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      type: 'textarea';
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      type: 'date';
      label: string;
      required?: boolean;
    }
  | {
      id: string;
      type: 'yes_no';
      label: string;
      required?: boolean;
    }
  | {
      id: string;
      type: 'single';
      label: string;
      options: string[];
      required?: boolean;
    }
  | {
      id: string;
      type: 'multi';
      label: string;
      options: string[];
      required?: boolean;
    }
  | {
      id: string;
      type: 'matrix';
      label: string;
      rows: { id: string; label: string }[];
      options: string[];
      required?: boolean;
    }
  | {
      id: string;
      type: 'section';
      label: string;
      required?: boolean;
    };

export type FleetExam = {
  key: string;
  qrLabel: string;
  title: string;
  trainingTopic: string;
  whenToUse: string;
  stickerNote?: string;
  msFormUrl?: string;
  questions: ExamQuestion[];
};

export const FLEET_EXAMS: FleetExam[] = syncedExams as FleetExam[];

export function getFleetExam(key: string): FleetExam | undefined {
  return FLEET_EXAMS.find((e) => e.key === key);
}

export function isValidFleetExamKey(key: string): boolean {
  return FLEET_EXAMS.some((e) => e.key === key);
}

/** จำนวนข้อที่ต้องตอบ (ไม่นับหัวข้อ section; ตาราง matrix นับเป็น 1 ข้อ) */
export function countableExamQuestions(exam: FleetExam): ExamQuestion[] {
  return exam.questions.filter((q) => q.type !== 'section');
}

/** ช่องคำตอบรายช่อง (matrix แตกเป็น 1 ช่องต่อแถว) — ใช้ทำคอลัมน์ตารางผลและการบันทึกคำตอบ */
export type ExamAnswerCell = { id: string; label: string };
export function examAnswerCells(exam: FleetExam): ExamAnswerCell[] {
  const cells: ExamAnswerCell[] = [];
  for (const q of exam.questions) {
    if (q.type === 'section') continue;
    if (q.type === 'matrix') {
      for (const row of q.rows) {
        cells.push({ id: row.id, label: `${q.label} — ${row.label}` });
      }
      continue;
    }
    cells.push({ id: q.id, label: q.label });
  }
  return cells;
}
