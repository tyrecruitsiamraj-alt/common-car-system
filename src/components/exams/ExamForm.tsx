import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { ExamQuestion, FleetExam } from '@/lib/fleetExamsConfig';
import { countableExamQuestions } from '@/lib/fleetExamsConfig';
import { submissionToScoreResult, type ExamSubmissionPayload } from '@/lib/fleetExamScoring';
import { apiFetch } from '@/lib/apiFetch';
import ExamScoreResultDialog from '@/components/exams/ExamScoreResultDialog';
import type { ExamScoreRow } from '@/components/exams/ExamScorePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Props = {
  exam: FleetExam;
};

function initialAnswers(questions: ExamQuestion[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) {
    if (q.type === 'yes_no') out[q.id] = '';
    else out[q.id] = '';
  }
  return out;
}

function parseMultiAnswer(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw.split('|||').map((s) => s.trim()).filter(Boolean);
}

function formatMultiAnswer(values: string[]): string {
  return values.join('|||');
}

const ExamForm: React.FC<Props> = ({ exam }) => {
  const [answers, setAnswers] = useState(() => initialAnswers(exam.questions));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [scoreRow, setScoreRow] = useState<ExamScoreRow | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const missingRequired = useMemo(() => {
    return countableExamQuestions(exam).filter((q) => {
      if (!q.required) return false;
      const v = (answers[q.id] ?? '').trim();
      if (q.type === 'multi') return parseMultiAnswer(v).length === 0;
      return !v;
    });
  }, [answers, exam]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missingRequired.length > 0) {
      toast.error(`กรุณาตอบให้ครบ (${missingRequired.length} ข้อ)`);
      return;
    }
    setSaving(true);
    try {
      const r = await apiFetch('/api/fleet-exam-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_key: exam.key,
          answers,
          submitter_name: answers.driver_name?.trim() || undefined,
          vehicle_plate: answers.plate?.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      const payload = (await r.json()) as ExamSubmissionPayload;
      const scored = submissionToScoreResult(payload);
      setScoreRow({
        id: payload.id,
        exam_key: payload.exam_key,
        exam_title: payload.exam_title,
        submitter_name: payload.submitter_name,
        vehicle_plate: payload.vehicle_plate,
        score_correct: scored.correct,
        score_total: scored.total,
        score_percent: scored.percent,
        passed: scored.passed,
        created_at: payload.created_at,
        details: scored.details,
      });
      setScoreOpen(true);
      setDone(true);
      toast.success('บันทึกข้อสอบแล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-foreground">ส่งข้อสอบเรียบร้อย</h2>
            <p className="text-sm text-muted-foreground mt-1">ระบบบันทึกคำตอบของคุณแล้ว</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {scoreRow ? (
              <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => setScoreOpen(true)}>
                ดูคะแนนอีกครั้ง
              </Button>
            ) : null}
            <Button asChild variant="outline" className="rounded-2xl">
              <Link to="/exams">กลับรายการข้อสอบ</Link>
            </Button>
            <Button
              type="button"
              className="rounded-2xl"
              onClick={() => {
                setAnswers(initialAnswers(exam.questions));
                setDone(false);
                setScoreRow(null);
                setScoreOpen(false);
              }}
            >
              ทำอีกครั้ง
            </Button>
          </div>
        </div>
        <ExamScoreResultDialog open={scoreOpen} onOpenChange={setScoreOpen} row={scoreRow} />
      </>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm space-y-2">
        <p>
          <span className="font-semibold text-foreground">หัวข้อนี้อบรม:</span>{' '}
          <span className="text-muted-foreground">{exam.trainingTopic}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">เมื่อไหร่ทำ:</span> {exam.whenToUse}
        </p>
      </div>

      <div className="space-y-4">
        {exam.questions.map((q, idx) => {
          if (q.type === 'section') {
            return (
              <div key={q.id} className="pt-2">
                <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">
                  {q.label}
                </h3>
              </div>
            );
          }

          const n = exam.questions.slice(0, idx).filter((x) => x.type !== 'section').length + 1;

          return (
            <div key={q.id} className="rounded-2xl border border-border/80 bg-card p-4 space-y-2">
              <Label className="text-sm font-medium leading-snug">
                {n}. {q.label}
                {q.required ? <span className="text-destructive ml-0.5">*</span> : null}
              </Label>

              {q.type === 'text' ? (
                <Input
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="h-10 text-sm"
                />
              ) : null}

              {q.type === 'date' ? (
                <Input
                  type="date"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="h-10 text-sm"
                />
              ) : null}

              {q.type === 'textarea' ? (
                <Textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="text-sm min-h-[4.5rem]"
                />
              ) : null}

              {q.type === 'yes_no' ? (
                <RadioGroup
                  value={answers[q.id] ?? ''}
                  onValueChange={(v) => setAnswer(q.id, v)}
                  className="flex gap-4 pt-1"
                >
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="yes" />
                    ใช่
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="no" />
                    ไม่
                  </label>
                </RadioGroup>
              ) : null}

              {q.type === 'single' ? (
                <RadioGroup
                  value={answers[q.id] ?? ''}
                  onValueChange={(v) => setAnswer(q.id, v)}
                  className="space-y-2 pt-1"
                >
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={cn(
                        'flex items-start gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40',
                        answers[q.id] === opt && 'border-primary/50 bg-primary/5',
                      )}
                    >
                      <RadioGroupItem value={opt} className="mt-0.5" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              ) : null}

              {q.type === 'multi' ? (
                <div className="space-y-2 pt-1">
                  {q.options.map((opt) => {
                    const selected = parseMultiAnswer(answers[q.id] ?? '');
                    const checked = selected.includes(opt);
                    return (
                      <label
                        key={opt}
                        className={cn(
                          'flex items-start gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40',
                          checked && 'border-primary/50 bg-primary/5',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = v
                              ? [...selected, opt]
                              : selected.filter((x) => x !== opt);
                            setAnswer(q.id, formatMultiAnswer(next));
                          }}
                          className="mt-0.5"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={saving} className="rounded-2xl h-11 min-w-[160px]">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังส่ง…
            </>
          ) : (
            'ส่งข้อสอบ'
          )}
        </Button>
        <Button type="button" variant="outline" asChild className="rounded-2xl h-11">
          <Link to="/exams">ยกเลิก</Link>
        </Button>
      </div>
    </form>
  );
};

export default ExamForm;
