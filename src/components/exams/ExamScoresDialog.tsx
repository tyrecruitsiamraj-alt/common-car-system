import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ExamScoresContent from '@/components/exams/ExamScoresContent';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ExamScoresDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            ดูคะแนนข้อสอบ
          </DialogTitle>
          <DialogDescription>
            ดูผลข้อสอบรวมล่าสุด — กรองแยกตามต้องการได้
          </DialogDescription>
        </DialogHeader>
        <ExamScoresContent />
      </DialogContent>
    </Dialog>
  );
};

export default ExamScoresDialog;
