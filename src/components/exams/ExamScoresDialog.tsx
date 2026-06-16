import React, { useCallback, useState } from 'react';
import { BarChart3, Loader2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FLEET_EXAMS } from '@/lib/fleetExamsConfig';
import { submissionToScoreResult, type ExamSubmissionPayload } from '@/lib/fleetExamScoring';
import { apiFetch } from '@/lib/apiFetch';
import ExamScorePanel, { type ExamScoreRow } from '@/components/exams/ExamScorePanel';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ExamScoresDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const [examKey, setExamKey] = useState<string>('all');
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExamScoreRow[]>([]);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    const q = new URLSearchParams();
    if (examKey !== 'all') q.set('exam_key', examKey);
    if (name.trim()) q.set('submitter_name', name.trim());
    if (plate.trim()) q.set('vehicle_plate', plate.trim());
    if (submissionId.trim()) q.set('id', submissionId.trim());
    if ([...q.keys()].length === 0) {
      toast.message('กรอกชื่อผู้ขับ ทะเบียน หรือรหัสการส่ง');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const r = await apiFetch(`/api/fleet-exam-submissions?${q}`);
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ExamSubmissionPayload[];
      const list = Array.isArray(data) ? data : [];
      setRows(
        list.map((sub) => {
          const scored = submissionToScoreResult(sub);
          return {
            id: sub.id,
            exam_key: sub.exam_key,
            exam_title: sub.exam_title,
            submitter_name: sub.submitter_name,
            vehicle_plate: sub.vehicle_plate,
            score_correct: scored.correct,
            score_total: scored.total,
            score_percent: scored.percent,
            passed: scored.passed,
            created_at: sub.created_at,
            details: scored.details,
          };
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'โหลดคะแนนไม่สำเร็จ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [examKey, name, plate, submissionId]);

  const reset = () => {
    setRows([]);
    setSearched(false);
    setName('');
    setPlate('');
    setSubmissionId('');
    setExamKey('all');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            ดูคะแนนข้อสอบ
          </DialogTitle>
          <DialogDescription>
            ค้นหาด้วยชื่อผู้ขับ ทะเบียนรถ หรือรหัสการส่ง (แสดงหลังส่งข้อสอบ)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">ข้อสอบ</Label>
            <Select value={examKey} onValueChange={setExamKey}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกข้อสอบ</SelectItem>
                {FLEET_EXAMS.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">ชื่อผู้ขับ</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ทะเบียนรถ</Label>
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                className="h-9 text-sm"
                placeholder="กข 1234"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">รหัสการส่ง (ถ้ามี)</Label>
            <Input
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              className="h-9 text-sm font-mono text-xs"
              placeholder="uuid หลังส่งข้อสอบ"
            />
          </div>
          <Button
            type="button"
            className="w-full rounded-2xl h-10"
            disabled={loading}
            onClick={() => void search()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                ค้นหาคะแนน
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3 pt-1">
          {!searched ? (
            <p className="text-sm text-muted-foreground text-center py-6">กรอกเงื่อนไขแล้วกดค้นหา</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">ไม่พบรายการ</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                <ExamScorePanel row={row} />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExamScoresDialog;
