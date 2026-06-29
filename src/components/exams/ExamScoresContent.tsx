import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw, X } from 'lucide-react';
import ExamSubmissionDetail from '@/components/exams/ExamSubmissionDetail';
import { type ExamScoreRow } from '@/components/exams/ExamScorePanel';
import { FLEET_EXAMS } from '@/lib/fleetExamsConfig';
import { submissionToScoreResult, type ExamSubmissionPayload } from '@/lib/fleetExamScoring';
import { apiFetch } from '@/lib/apiFetch';
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

const RECENT_LIMIT = 50;

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

function mergeSubmissions(
  base: ExamSubmissionPayload[],
  extra: ExamSubmissionPayload[],
): ExamSubmissionPayload[] {
  const byId = new Map<string, ExamSubmissionPayload>();
  for (const sub of [...extra, ...base]) byId.set(sub.id, sub);
  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function matchesFilters(
  sub: ExamSubmissionPayload,
  filters: { examKey: string; name: string; plate: string; submissionId: string },
): boolean {
  if (filters.examKey !== 'all' && sub.exam_key !== filters.examKey) return false;
  if (filters.name.trim()) {
    const n = (sub.submitter_name ?? '').toLowerCase();
    if (!n.includes(filters.name.trim().toLowerCase())) return false;
  }
  if (filters.plate.trim()) {
    const p = (sub.vehicle_plate ?? '').toLowerCase();
    if (!p.includes(filters.plate.trim().toLowerCase())) return false;
  }
  if (filters.submissionId.trim()) {
    const id = filters.submissionId.trim().toLowerCase();
    if (sub.id.toLowerCase() !== id && !sub.id.toLowerCase().includes(id)) return false;
  }
  return true;
}

type Props = {
  /** เปิดรายละเอียดเมื่อเหลือรายการเดียว */
  expandWhenSingle?: boolean;
};

const ExamScoresContent: React.FC<Props> = ({ expandWhenSingle = true }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [examKey, setExamKey] = useState(searchParams.get('exam_key') ?? 'all');
  const [name, setName] = useState(searchParams.get('submitter_name') ?? '');
  const [plate, setPlate] = useState(searchParams.get('vehicle_plate') ?? '');
  const [submissionId, setSubmissionId] = useState(searchParams.get('id') ?? '');
  const [loading, setLoading] = useState(true);
  const [allSubmissions, setAllSubmissions] = useState<ExamSubmissionPayload[]>([]);

  const filters = useMemo(
    () => ({ examKey, name, plate, submissionId }),
    [examKey, name, plate, submissionId],
  );

  const filteredSubmissions = useMemo(
    () => allSubmissions.filter((sub) => matchesFilters(sub, filters)),
    [allSubmissions, filters],
  );

  const filteredRows = useMemo(() => filteredSubmissions.map(toScoreRow), [filteredSubmissions]);

  const submissionById = useMemo(() => {
    const map = new Map<string, ExamSubmissionPayload>();
    for (const sub of allSubmissions) map.set(sub.id, sub);
    return map;
  }, [allSubmissions]);

  const hasActiveFilters =
    examKey !== 'all' || name.trim() !== '' || plate.trim() !== '' || submissionId.trim() !== '';

  const loadAll = useCallback(async (opts?: { ensureId?: string }) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('recent', String(RECENT_LIMIT));
      const r = await apiFetch(`/api/fleet-exam-submissions?${q}`);
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ExamSubmissionPayload[];
      let list = Array.isArray(data) ? data : [];

      const ensureId = opts?.ensureId?.trim();
      if (ensureId && !list.some((sub) => sub.id === ensureId)) {
        const one = await apiFetch(`/api/fleet-exam-submissions?id=${encodeURIComponent(ensureId)}`);
        if (one.ok) {
          const oneData = (await one.json()) as ExamSubmissionPayload[];
          if (Array.isArray(oneData) && oneData[0]) {
            list = mergeSubmissions(list, oneData);
          }
        }
      }

      setAllSubmissions(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'โหลดผลข้อสอบไม่สำเร็จ');
      setAllSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll({ ensureId: searchParams.get('id') ?? undefined });
  }, [loadAll]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const next = new URLSearchParams();
    if (examKey !== 'all') next.set('exam_key', examKey);
    if (name.trim()) next.set('submitter_name', name.trim());
    if (plate.trim()) next.set('vehicle_plate', plate.trim());
    if (submissionId.trim()) next.set('id', submissionId.trim());
    setSearchParams(next, { replace: true });
  }, [examKey, name, plate, submissionId, setSearchParams]);

  const clearFilters = () => {
    setExamKey('all');
    setName('');
    setPlate('');
    setSubmissionId('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">ตัวกรอง</p>
          <div className="flex flex-wrap gap-2">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                ล้างตัวกรอง
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs"
              disabled={loading}
              onClick={() => void loadAll({ ensureId: submissionId.trim() || undefined })}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  รีเฟรช
                </>
              )}
            </Button>
          </div>
        </div>

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
              placeholder="กรองตามชื่อ"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ทะเบียนรถ</Label>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="h-9 text-sm"
              placeholder="กรองตามทะเบียน"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">รหัสการส่ง</Label>
          <Input
            value={submissionId}
            onChange={(e) => setSubmissionId(e.target.value)}
            className="h-9 text-sm font-mono text-xs"
            placeholder="กรองตาม uuid"
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลดรายการ…
          </div>
        ) : null}

        {!loading && allSubmissions.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            แสดง {filteredRows.length} จาก {allSubmissions.length} รายการล่าสุด
            {hasActiveFilters ? ' (กรองแล้ว)' : ''}
          </p>
        ) : null}

        {!loading && allSubmissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีผลข้อสอบในระบบ</p>
        ) : null}

        {!loading && allSubmissions.length > 0 && filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            ไม่พบรายการที่ตรงกับตัวกรอง — ลองล้างตัวกรองหรือกดรีเฟรช
          </p>
        ) : null}

        {!loading
          ? filteredRows.map((row, idx) => (
              <ExamSubmissionDetail
                key={row.id}
                row={row}
                submission={submissionById.get(row.id)}
                defaultExpanded={expandWhenSingle && filteredRows.length === 1 && idx === 0}
              />
            ))
          : null}
      </div>
    </div>
  );
};

export default ExamScoresContent;
