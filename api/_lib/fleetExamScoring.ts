/** คำนวณคะแนนข้อสอบ — ตรงกับ src/lib/fleetExamScoring.ts */

type Question =
  | { id: string; type: 'yes_no'; label: string }
  | { id: string; type: 'single'; label: string; options: string[] };

const EXAM_QUESTIONS: Record<string, Question[]> = {
  start_work_sticker_single: [
    { id: 'lights_ok', type: 'yes_no', label: 'ไฟ' },
    { id: 'brakes_ok', type: 'yes_no', label: 'เบรก' },
    { id: 'tires_ok', type: 'yes_no', label: 'ยาง' },
    { id: 'docs_ok', type: 'yes_no', label: 'เอกสาร' },
    {
      id: 'safety_knowledge',
      type: 'single',
      label: 'ความรู้',
      options: ['แจ้งหัวหน้า/ช่าง และไม่ออกรถจนกว่าจะแก้ไข'],
    },
  ],
  fuel_refill: [
    { id: 'receipt_kept', type: 'yes_no', label: 'ใบเสร็จ' },
    {
      id: 'fuel_knowledge',
      type: 'single',
      label: 'ความรู้',
      options: ['เพื่อตรวจสอบอัตราสิ้นเปลืองและควบคุมต้นทุน'],
    },
  ],
  daily_driver_check: [
    { id: 'rested', type: 'yes_no', label: 'พักผ่อน' },
    { id: 'no_alcohol', type: 'yes_no', label: 'แอลกอฮอล์' },
    { id: 'fit_to_drive', type: 'yes_no', label: 'พร้อมขับ' },
    { id: 'medication_safe', type: 'yes_no', label: 'ยา' },
    {
      id: 'health_knowledge',
      type: 'single',
      label: 'ความรู้',
      options: ['หยุดขับ แจ้งหัวหน้า และขอความช่วยเหลือ'],
    },
  ],
};

function expectedAnswer(q: Question): string | null {
  if (q.type === 'yes_no') return 'yes';
  if (q.type === 'single') return q.options[0] ?? null;
  return null;
}

export function scoreExamAnswers(
  examKey: string,
  answers: Record<string, string>,
): { correct: number; total: number; percent: number; passed: boolean } {
  const questions = EXAM_QUESTIONS[examKey] ?? [];
  let correct = 0;
  let total = 0;
  let criticalNo = false;

  for (const q of questions) {
    const expected = expectedAnswer(q);
    if (!expected) continue;
    total += 1;
    const raw = (answers[q.id] ?? '').trim();
    if (q.type === 'yes_no' && raw === 'no') criticalNo = true;
    if (raw === expected) correct += 1;
  }

  const percent = total > 0 ? Math.round((correct / total) * 100) : 100;
  const passed = percent === 100 && !criticalNo;
  return { correct, total, percent, passed };
}
