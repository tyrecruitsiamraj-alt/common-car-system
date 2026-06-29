import React from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { type ExamScoreRow } from '@/components/exams/ExamScorePanel';
import { submissionAnswerRows, type ExamSubmissionPayload } from '@/lib/fleetExamScoring';

type Props = {
  row: ExamScoreRow;
  submission?: ExamSubmissionPayload;
};

const ExamSubmissionDetail: React.FC<Props> = ({ row, submission }) => {
  const answerRows = submission ? submissionAnswerRows(submission) : [];

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="border-b border-border/60 bg-muted/20 px-4 py-3 space-y-0.5">
        <p className="font-semibold text-foreground leading-snug">{row.exam_title}</p>
        <p className="text-xs text-muted-foreground">
          {row.submitter_name || '—'}
          {row.vehicle_plate ? ` · ${row.vehicle_plate}` : ''}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {format(parseISO(row.created_at), 'd MMM yyyy HH:mm', { locale: th })}
        </p>
      </header>

      {answerRows.length > 0 ? (
        <dl className="divide-y divide-border/50">
          {answerRows.map((item, idx) => (
            <div key={item.questionId} className="px-4 py-2.5">
              <dt className="text-xs text-muted-foreground leading-snug">
                {idx + 1}. {item.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">ไม่มีข้อมูลคำตอบ</p>
      )}

      <footer className="border-t border-border/60 bg-muted/10 px-4 py-2 text-[10px] text-muted-foreground font-mono break-all">
        {row.id}
      </footer>
    </article>
  );
};

export default ExamSubmissionDetail;
