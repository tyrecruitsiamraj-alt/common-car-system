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

/** จำนวนข้อที่ต้องตอบ (ไม่นับหัวข้อ section) */
export function countableExamQuestions(exam: FleetExam): ExamQuestion[] {
  return exam.questions.filter((q) => q.type !== 'section');
}
