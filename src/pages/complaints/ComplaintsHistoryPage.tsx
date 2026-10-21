import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SearchablePicker, { type SearchablePickerOption } from '@/components/shared/SearchablePicker';
import { apiFetch } from '@/lib/apiFetch';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import { summarizeIssueReportRow, type IssueReportRow } from '@/lib/issueReportStats';
import type { AccidentCase } from '@/types';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ISSUE_REPORT_TYPES.map((t) => [t.slug, t.label]),
);

function AccidentEditor({
  row,
  accidentCases,
  onSaved,
}: {
  row: IssueReportRow;
  accidentCases: AccidentCase[];
  onSaved: (updated: IssueReportRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [related, setRelated] = useState(Boolean(row.related_accident));
  const [caseId, setCaseId] = useState(row.accident_case_id ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRelated(Boolean(row.related_accident));
    setCaseId(row.accident_case_id ?? '');
  }, [open, row.related_accident, row.accident_case_id]);

  const accidentOptions: SearchablePickerOption[] = useMemo(
    () =>
      accidentCases.map((c) => ({
        value: c.id,
        label: `${c.case_date} — ${c.employee_name}${c.case_detail ? ` — ${c.case_detail.slice(0, 40)}` : ''}`,
        keywords: `${c.vehicle_model ?? ''} ${c.location_name ?? ''}`,
      })),
    [accidentCases],
  );

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiFetch(`/api/issue-reports?id=${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          related_accident: related,
          accident_case_id: related ? caseId || null : null,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as IssueReportRow & { error?: string; message?: string };
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      toast.success('บันทึกแล้ว');
      onSaved({ ...row, related_accident: j.related_accident, accident_case_id: j.accident_case_id });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex">
          {row.related_accident ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> มีอุบัติเหตุ
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              -
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start">
        <div className="flex items-center justify-between">
          <Label htmlFor={`related-accident-${row.id}`} className="text-sm">
            เกี่ยวข้องกับอุบัติเหตุ
          </Label>
          <Switch id={`related-accident-${row.id}`} checked={related} onCheckedChange={setRelated} />
        </div>
        {related ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">เชื่อมโยงกับเคสอุบัติเหตุ (ถ้ามี)</Label>
            <SearchablePicker
              value={caseId}
              onValueChange={setCaseId}
              options={accidentOptions}
              placeholder="พิมพ์ชื่อ/วันที่เพื่อค้นหาเคสอุบัติเหตุ…"
              emptyMessage="ไม่พบเคสอุบัติเหตุที่ตรงกัน"
            />
          </div>
        ) : null}
        <Button type="button" size="sm" className="w-full" onClick={() => void save()} disabled={saving}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const ComplaintsHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<IssueReportRow[]>([]);
  const [accidentCases, setAccidentCases] = useState<AccidentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('employee') ?? searchParams.get('reporter') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch('/api/issue-reports').then((r) => (r.ok ? r.json() : [])),
      apiFetch('/api/accident-cases').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([issueReports, accidents]) => {
        if (cancelled) return;
        setRows(Array.isArray(issueReports) ? (issueReports as IssueReportRow[]) : []);
        setAccidentCases(Array.isArray(accidents) ? (accidents as AccidentCase[]) : []);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setAccidentCases([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accidentById = useMemo(() => new Map(accidentCases.map((c) => [c.id, c])), [accidentCases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => category === 'all' || r.category === category)
      .filter((r) => {
        if (!q) return true;
        return (
          (r.employee_name ?? '').toLowerCase().includes(q) ||
          (r.reporter_name ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.report_date ?? '').localeCompare(a.report_date ?? '') || b.created_at.localeCompare(a.created_at));
  }, [rows, query, category]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link
            to="/complaints/overview"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> ภาพรวม Complaints
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">ประวัติพนักงาน / ผู้แจ้ง</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ค้นหาย้อนหลังว่าพนักงานคนไหนถูกแจ้งเรื่องอะไรบ้าง และใครเป็นผู้แจ้ง — ใช้ประกอบการประเมินความเหมาะสมของพนักงาน
            {loading ? ' · กำลังโหลด…' : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อพนักงาน หรือ ชื่อผู้แจ้ง…"
            className="sm:max-w-xs"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="หมวด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวด</SelectItem>
              {ISSUE_REPORT_TYPES.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">ทั้งหมด {filtered.length} เคส</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>หมวด</TableHead>
                <TableHead>พนักงาน (ถูกรายงาน)</TableHead>
                <TableHead>ผู้แจ้ง</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead>อุบัติเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const linkedAccident = r.accident_case_id ? accidentById.get(r.accident_case_id) : undefined;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{r.report_date ?? '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{CATEGORY_LABEL[r.category] ?? r.category}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.employee_name ?? '-'}</div>
                      {r.position ? <div className="text-xs text-muted-foreground">{r.position}</div> : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{r.reporter_name ?? '-'}</div>
                      {r.reporter_phone ? <div className="text-xs text-muted-foreground">{r.reporter_phone}</div> : null}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {summarizeIssueReportRow(r)}
                      {linkedAccident ? (
                        <div className="mt-1 text-[11px] text-red-600">
                          เชื่อมกับเคสอุบัติเหตุ {linkedAccident.case_date} — {linkedAccident.case_detail ?? ''}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <AccidentEditor
                        row={r}
                        accidentCases={accidentCases}
                        onSaved={(updated) =>
                          setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    ไม่พบข้อมูล
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
};

export default ComplaintsHistoryPage;
