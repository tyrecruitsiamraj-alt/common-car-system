import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { type ExamScoreRow } from '@/components/exams/ExamScorePanel';
import { countableExamQuestions, getFleetExam } from '@/lib/fleetExamsConfig';
import { submissionAnswerRows, type ExamSubmissionPayload } from '@/lib/fleetExamScoring';
import { cn } from '@/lib/utils';

type Props = {
  rows: ExamScoreRow[];
  submissions: Map<string, ExamSubmissionPayload>;
};

type ExamGroup = {
  examKey: string;
  examTitle: string;
  rows: ExamScoreRow[];
};

function groupByExam(rows: ExamScoreRow[]): ExamGroup[] {
  const order: string[] = [];
  const map = new Map<string, ExamScoreRow[]>();
  for (const row of rows) {
    if (!map.has(row.exam_key)) {
      map.set(row.exam_key, []);
      order.push(row.exam_key);
    }
    map.get(row.exam_key)!.push(row);
  }
  return order.map((examKey) => ({
    examKey,
    examTitle: rows.find((r) => r.exam_key === examKey)?.exam_title ?? examKey,
    rows: map.get(examKey) ?? [],
  }));
}

function answerByQuestionId(sub?: ExamSubmissionPayload): Map<string, string> {
  if (!sub) return new Map();
  return new Map(submissionAnswerRows(sub).map((r) => [r.questionId, r.answer]));
}

const STICKY_META =
  'sticky z-10 bg-card shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border/60';

const ExamResultsTable: React.FC<Props> = ({ rows, submissions }) => {
  const groups = useMemo(() => groupByExam(rows), [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const exam = getFleetExam(group.examKey);
        const questions = exam ? countableExamQuestions(exam) : [];

        return (
          <section key={group.examKey} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground px-1">{group.examTitle}</h3>
            <div className="rounded-2xl border border-border bg-card overflow-x-auto">
              <table className="w-max min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th
                      className={cn(
                        STICKY_META,
                        'left-0 min-w-[7.5rem] px-3 py-2 text-left text-xs font-semibold text-muted-foreground',
                      )}
                    >
                      วันที่
                    </th>
                    <th
                      className={cn(
                        STICKY_META,
                        'left-[7.5rem] min-w-[6.5rem] px-3 py-2 text-left text-xs font-semibold text-muted-foreground',
                      )}
                    >
                      ผู้ขับ
                    </th>
                    <th
                      className={cn(
                        STICKY_META,
                        'left-[14rem] min-w-[5.5rem] px-3 py-2 text-left text-xs font-semibold text-muted-foreground',
                      )}
                    >
                      ทะเบียน
                    </th>
                    {questions.map((q, idx) => (
                      <th
                        key={q.id}
                        title={q.label}
                        className="min-w-[8.5rem] max-w-[11rem] px-3 py-2 text-left align-bottom border-l border-border/40"
                      >
                        <span className="block text-[10px] font-medium text-muted-foreground">
                          ข้อ {idx + 1}
                        </span>
                        <span className="block text-xs font-semibold text-foreground leading-snug line-clamp-2">
                          {q.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {group.rows.map((row) => {
                    const answers = answerByQuestionId(submissions.get(row.id));
                    return (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td
                          className={cn(
                            STICKY_META,
                            'left-0 px-3 py-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap',
                          )}
                        >
                          {format(parseISO(row.created_at), 'd MMM yy HH:mm', { locale: th })}
                        </td>
                        <td
                          className={cn(
                            STICKY_META,
                            'left-[7.5rem] px-3 py-2 text-sm font-medium text-foreground whitespace-nowrap',
                          )}
                        >
                          {row.submitter_name || '—'}
                        </td>
                        <td
                          className={cn(
                            STICKY_META,
                            'left-[14rem] px-3 py-2 text-sm text-foreground whitespace-nowrap',
                          )}
                        >
                          {row.vehicle_plate || '—'}
                        </td>
                        {questions.map((q) => (
                          <td
                            key={q.id}
                            className="px-3 py-2 text-sm text-foreground align-top border-l border-border/30 min-w-[8.5rem] max-w-[11rem]"
                          >
                            {answers.get(q.id) ?? '—'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ExamResultsTable;
