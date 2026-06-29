import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ExamScorePanel, { type ExamScoreRow } from '@/components/exams/ExamScorePanel';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ExamScoreRow | null;
  onDone?: () => void;
};

const ExamScoreResultDialog: React.FC<Props> = ({ open, onOpenChange, row, onDone }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            ผลคะแนนข้อสอบ
          </DialogTitle>
          <DialogDescription>
            บันทึกคำตอบแล้ว — เก็บรหัสการส่งไว้สำหรับค้นหาคะแนนภายหลัง
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="space-y-3">
            <ExamScorePanel row={row} />
            <p className="text-[11px] text-muted-foreground font-mono break-all rounded-xl bg-muted/40 px-3 py-2">
              รหัสการส่ง: {row.id}
            </p>
            <Button asChild type="button" variant="outline" className="w-full rounded-2xl">
              <Link to={`/exams/results?id=${row.id}`}>เปิดหน้าผลข้อสอบเต็ม</Link>
            </Button>
            <Button
              type="button"
              className="w-full rounded-2xl"
              onClick={() => {
                onOpenChange(false);
                onDone?.();
              }}
            >
              ปิด
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ExamScoreResultDialog;
