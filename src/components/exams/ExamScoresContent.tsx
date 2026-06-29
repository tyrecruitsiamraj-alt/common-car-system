import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import ExamSubmissionDetail from '@/components/exams/ExamSubmissionDetail';
import { type ExamScoreRow } from '@/components/exams/ExamScorePanel';
import { FLEET_EXAMS } from '@/lib/fleetExamsConfig';
import { submissionToScoreResult, type ExamSubmissionPayload } from '@/lib/fleetExamScoring';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/contexts/AuthContext';
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
import { toast } from 'sonner';

function toScoreRow(sub: ExamSubmissionPayload): ExamScoreRow {
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
}

type Props = {
  /** เปิดรายละเอียดรายการแรกอัตโนมัติ */
  expandFirst?: boolean;
};

const ExamScoresContent: React.FC<Props> = ({ expandFirst = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const isStaff =
    isAuthenticated && user && (user.role === 'staff' || user.role === 'supervisor' || user.role === 'admin');

  const initialId = searchParams.get('id') ?? '';
  const initialName = searchParams.get('submitter_name') ?? '';
  const initialPlate = searchParams.get('vehicle_plate') ?? '';
  const initialExamKey = searchParams.get('exam_key') ?? 'all';

  const [examKey, setExamKey] = useState(initialExamKey);
  const [name, setName] = useState(initialName);
  const [plate, setPlate] = useState(initialPlate);
  const [submissionId, setSubmissionId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExamScoreRow[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmissionPayload[]>([]);
  const [searched, setSearched] = useState(false);
  const [recentMode, setRecentMode] = useState(false);

  const submissionById = useMemo(() => {
    const map = new Map<string, ExamSubmissionPayload>();
    for (const sub of submissions) map.set(sub.id, sub);
    return map;
  }, [submissions]);

  const fetchResults = useCallback(
    async (opts?: { recent?: boolean; syncUrl?: boolean }) => {
      const q = new URLSearchParams();
      if (opts?.recent && isStaff) {
        q.set('recent', '30');
        if (examKey !== 'all') q.set('exam_key', examKey);
      } else {
        if (examKey !== 'all') q.set('exam_key', examKey);
        if (name.trim()) q.set('submitter_name', name.trim());
        if (plate.trim()) q.set('vehicle_plate', plate.trim());
        if (submissionId.trim()) q.set('id', submissionId.trim());
        if ([...q.keys()].length === 0) {
          toast.message('กรอกชื่อผู้ขับ ทะเบียน หรือรหัสการส่ง');
          return;
        }
      }

      setLoading(true);
      setSearched(true);
      setRecentMode(!!opts?.recent);

      try {
        const r = await apiFetch(`/api/fleet-exam-submissions?${q}`);
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { message?: string };
          throw new Error(j.message || `HTTP ${r.status}`);
        }
        const data = (await r.json()) as ExamSubmissionPayload[];
        const list = Array.isArray(data) ? data : [];
        setSubmissions(list);
        setRows(list.map(toScoreRow));

        if (opts?.syncUrl !== false && !opts?.recent) {
          const next = new URLSearchParams();
          if (examKey !== 'all') next.set('exam_key', examKey);
          if (name.trim()) next.set('submitter_name', name.trim());
          if (plate.trim()) next.set('vehicle_plate', plate.trim());
          if (submissionId.trim()) next.set('id', submissionId.trim());
          setSearchParams(next, { replace: true });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'โหลดผลข้อสอบไม่สำเร็จ');
        setRows([]);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    },
    [examKey, isStaff, name, plate, setSearchParams, submissionId],
  );

  useEffect(() => {
    if (initialId || initialName || initialPlate) {
      void fetchResults({ syncUrl: false });
      return;
    }
    if (isStaff) {
      void fetchResults({ recent: true, syncUrl: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
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

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-2xl h-10 flex-1 sm:flex-none sm:min-w-[160px]"
            disabled={loading}
            onClick={() => void fetchResults()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                ค้นหา
              </>
            )}
          </Button>
          {isStaff ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl h-10"
              disabled={loading}
              onClick={() => void fetchResults({ recent: true })}
            >
              รายการล่าสุด
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!searched && !loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            กรอกเงื่อนไขแล้วกดค้นหา
            {isStaff ? ' หรือดูรายการล่าสุด' : ''}
          </p>
        ) : null}

        {searched && !loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่พบรายการ</p>
        ) : null}

        {recentMode && rows.length > 0 ? (
          <p className="text-xs text-muted-foreground">แสดง {rows.length} รายการล่าสุด (เจ้าหน้าที่)</p>
        ) : null}

        {rows.map((row, idx) => (
          <ExamSubmissionDetail
            key={row.id}
            row={row}
            submission={submissionById.get(row.id)}
            defaultExpanded={expandFirst && idx === 0}
          />
        ))}
      </div>
    </div>
  );
};

export default ExamScoresContent;
