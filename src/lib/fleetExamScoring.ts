import type { ExamQuestion, FleetExam } from '@/lib/fleetExamsConfig';
import { getFleetExam } from '@/lib/fleetExamsConfig';

export type ExamScoreDetail = {
  questionId: string;
  label: string;
  scorable: boolean;
  correct: boolean | null;
  answer: string;
  expected?: string;
};

export type ExamScoreResult = {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  details: ExamScoreDetail[];
};

function expectedAnswer(q: ExamQuestion): string | null {
  if (q.type === 'yes_no') return 'yes';
  if (q.type === 'single') return q.options[0] ?? null;
  return null;
}

function formatAnswerDisplay(q: ExamQuestion, raw: string): string {
  if (q.type === 'yes_no') {
    if (raw === 'yes') return 'ใช่';
    if (raw === 'no') return 'ไม่';
    return raw;
  }
  if (q.type === 'multi' && raw.includes('|||')) {
    return raw.split('|||').filter(Boolean).join(', ');
  }
  return raw;
}

function formatExpectedDisplay(q: ExamQuestion, expected: string): string {
  if (q.type === 'yes_no') return expected === 'yes' ? 'ใช่' : 'ไม่';
  return expected;
}

export function scoreFleetExam(exam: FleetExam, answers: Record<string, string>): ExamScoreResult {
  const details: ExamScoreDetail[] = [];
  let correct = 0;
  let total = 0;

  for (const q of exam.questions) {
    const expected = expectedAnswer(q);
    const raw = (answers[q.id] ?? '').trim();
    if (!expected) {
      details.push({
        questionId: q.id,
        label: q.label,
        scorable: false,
        correct: null,
        answer: formatAnswerDisplay(q, raw),
      });
      continue;
    }
    total += 1;
    const ok = raw === expected;
    if (ok) correct += 1;
    details.push({
      questionId: q.id,
      label: q.label,
      scorable: true,
      correct: ok,
      answer: formatAnswerDisplay(q, raw),
      expected: formatExpectedDisplay(q, expected),
    });
  }

  const percent = total > 0 ? Math.round((correct / total) * 100) : 100;
  const criticalNo = exam.questions.some(
    (q) => q.type === 'yes_no' && (answers[q.id] ?? '').trim() === 'no',
  );
  const passed = percent === 100 && !criticalNo;

  return { correct, total, percent, passed, details };
}

export function scoreLabel(result: ExamScoreResult): string {
  if (result.total === 0) return 'บันทึกแล้ว (ไม่มีข้อคะแนน)';
  return `${result.correct}/${result.total} (${result.percent}%)`;
}

export type ExamSubmissionPayload = {
  id: string;
  exam_key: string;
  exam_title: string;
  submitter_name?: string;
  vehicle_plate?: string;
  score_correct: number;
  score_total: number;
  score_percent: number;
  passed: boolean;
  created_at: string;
  answers?: Record<string, string>;
};

export type ExamSubmissionAnswerRow = {
  questionId: string;
  label: string;
  answer: string;
};

export function submissionAnswerRows(sub: ExamSubmissionPayload): ExamSubmissionAnswerRow[] {
  const exam = getFleetExam(sub.exam_key);
  if (!exam || !sub.answers) return [];
  const rows: ExamSubmissionAnswerRow[] = [];
  for (const q of exam.questions) {
    if (q.type === 'section') continue;
    const raw = (sub.answers[q.id] ?? '').trim();
    rows.push({
      questionId: q.id,
      label: q.label,
      answer: formatAnswerDisplay(q, raw) || '—',
    });
  }
  return rows;
}

export function submissionToScoreResult(sub: ExamSubmissionPayload): ExamScoreResult & { id: string } {
  const exam = getFleetExam(sub.exam_key);
  if (exam && sub.answers) {
    const scored = scoreFleetExam(exam, sub.answers);
    return {
      id: sub.id,
      correct: scored.correct,
      total: scored.total,
      percent: scored.percent,
      passed: scored.passed,
      details: scored.details,
    };
  }
  return {
    id: sub.id,
    correct: sub.score_correct,
    total: sub.score_total,
    percent: sub.score_percent,
    passed: sub.passed,
    details: [],
  };
}
