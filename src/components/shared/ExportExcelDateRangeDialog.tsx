import React, { useEffect, useState } from 'react';
import DateSelectDmyBe from '@/components/shared/DateSelectDmyBe';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatYmdDmyBe } from '@/lib/dateTh';
import { isValidExportYmdRange, type ExportYmdRange } from '@/lib/exportDateRange';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultFromYmd: string;
  defaultToYmd: string;
  exporting?: boolean;
  onConfirm: (range: ExportYmdRange) => void | Promise<void>;
};

export default function ExportExcelDateRangeDialog({
  open,
  onOpenChange,
  title,
  description = 'เลือกวันเริ่มต้นและวันสิ้นสุดของข้อมูลที่ต้องการส่งออก',
  defaultFromYmd,
  defaultToYmd,
  exporting = false,
  onConfirm,
}: Props) {
  const [fromYmd, setFromYmd] = useState(defaultFromYmd);
  const [toYmd, setToYmd] = useState(defaultToYmd);

  useEffect(() => {
    if (!open) return;
    setFromYmd(defaultFromYmd);
    setToYmd(defaultToYmd);
  }, [open, defaultFromYmd, defaultToYmd]);

  const rangeValid = isValidExportYmdRange(fromYmd, toYmd);

  const handleConfirm = () => {
    if (!rangeValid) return;
    void onConfirm({ fromYmd, toYmd });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="export-from-date">ตั้งแต่วันที่</Label>
            <DateSelectDmyBe
              value={fromYmd}
              onChange={setFromYmd}
              aria-label="ตั้งแต่วันที่"
              triggerClassName="w-full h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-to-date">ถึงวันที่</Label>
            <DateSelectDmyBe
              value={toYmd}
              onChange={setToYmd}
              minYmd={fromYmd}
              aria-label="ถึงวันที่"
              triggerClassName="w-full h-10"
            />
          </div>
          {rangeValid ? (
            <p className="text-xs text-muted-foreground">
              ช่วงที่เลือก: {formatYmdDmyBe(fromYmd)}
              {fromYmd !== toYmd ? ` — ${formatYmdDmyBe(toYmd)}` : ''}
            </p>
          ) : (
            <p className="text-xs text-destructive">กรุณาเลือกวันที่ให้ถูกต้อง และวันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!rangeValid || exporting}>
            {exporting ? 'กำลังส่งออก…' : 'ส่งออก Excel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
