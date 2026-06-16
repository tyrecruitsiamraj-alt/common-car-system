import React from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { ExamScoreResult } from '@/lib/fleetExamScoring';
import { scoreLabel } from '@/lib/fleetExamScoring';
import { cn } from '@/lib/utils';

export type ExamScoreRow = {
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
  details?: ExamScoreResult['details'];
};

type Props = {
  row: ExamScoreRow;
  showDetails?: boolean;
};

export function ExamScoreSummary({ row }: { row: Pick<ExamScoreRow, 'score_correct' | 'score_total' | 'score_percent' | 'passed'> }) {
  const result: ExamScoreResult = {
    correct: row.score_correct,
    total: row.score_total,
    percent: row.score_percent,
    passed: row.passed,
    details: [],
  };
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
        row.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900',
      )}
    >
      {row.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {scoreLabel(result)}
      {row.total > 0 ? (row.passed ? ' · ผ่าน' : ' · ไม่ผ่าน') : null}
    </div>
  );
}

const ExamScorePanel: React.FC<Props> = ({ row, showDetails = true }) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{row.exam_title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {row.submitter_name || '—'}
            {row.vehicle_plate ? ` · ${row.vehicle_plate}` : ''}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {format(parseISO(row.created_at), 'd MMM yyyy HH:mm', { locale: th })}
          </p>
        </div>
        <ExamScoreSummary row={row} />
      </div>

      {showDetails && row.details && row.details.length > 0 ? (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto text-xs border-t border-border/60 pt-3">
          {row.details
            .filter((d) => d.scorable)
            .map((d) => (
              <li
                key={d.questionId}
                className={cn(
                  'rounded-lg px-2.5 py-1.5',
                  d.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900',
                )}
              >
                <span className="font-medium">{d.label}</span>
                <span className="block text-[11px] opacity-90 mt-0.5">
                  ตอบ: {d.answer || '—'}
                  {!d.correct && d.expected ? ` · เฉลย: ${d.expected}` : ''}
                </span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
};

export default ExamScorePanel;
