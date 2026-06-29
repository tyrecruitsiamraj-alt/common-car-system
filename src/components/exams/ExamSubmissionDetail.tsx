import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ExamScorePanel, { type ExamScoreRow } from '@/components/exams/ExamScorePanel';
import { submissionAnswerRows, type ExamSubmissionPayload } from '@/lib/fleetExamScoring';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  row: ExamScoreRow;
  submission?: ExamSubmissionPayload;
  defaultExpanded?: boolean;
};

const ExamSubmissionDetail: React.FC<Props> = ({ row, submission, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const answerRows = submission ? submissionAnswerRows(submission) : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <ExamScorePanel row={row} showDetails={row.score_total > 0} />

      {answerRows.length > 0 ? (
        <div className="border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {expanded ? 'ซ่อนคำตอบทั้งหมด' : 'ดูคำตอบทั้งหมด'}
          </Button>

          {expanded ? (
            <ol className="mt-2 space-y-2 max-h-[min(28rem,60vh)] overflow-y-auto">
              {answerRows.map((item, idx) => (
                <li
                  key={item.questionId}
                  className={cn('rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm')}
                >
                  <p className="text-xs font-medium text-muted-foreground">{idx + 1}.</p>
                  <p className="font-medium text-foreground leading-snug">{item.label}</p>
                  <p className="mt-1 text-sm text-foreground/90">{item.answer}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground font-mono break-all rounded-xl bg-muted/40 px-3 py-2">
        รหัสการส่ง: {row.id}
      </p>
    </div>
  );
};

export default ExamSubmissionDetail;
