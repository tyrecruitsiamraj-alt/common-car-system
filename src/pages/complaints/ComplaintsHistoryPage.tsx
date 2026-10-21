import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/apiFetch';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import { summarizeIssueReportRow, type IssueReportRow } from '@/lib/issueReportStats';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ISSUE_REPORT_TYPES.map((t) => [t.slug, t.label]),
);

const ComplaintsHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<IssueReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('employee') ?? searchParams.get('reporter') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/issue-reports')
      .then((r) => (r.ok ? r.json() : []))
      .then((issueReports) => {
        if (cancelled) return;
        setRows(Array.isArray(issueReports) ? (issueReports as IssueReportRow[]) : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
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
                  <TableCell className="max-w-xs text-xs text-muted-foreground">{summarizeIssueReportRow(r)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
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
