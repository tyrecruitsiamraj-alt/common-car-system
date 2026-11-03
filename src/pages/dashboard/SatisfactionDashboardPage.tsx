import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, FileSpreadsheet, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SearchablePicker from '@/components/shared/SearchablePicker';
import MonthNav from '@/components/work-hours/MonthNav';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/contexts/AuthContext';
import { monthKey } from '@/lib/caseReportStats';
import { toYmdLocal } from '@/lib/dateTh';
import type { IssueReportRow } from '@/lib/issueReportStats';
import {
  SATISFACTION_CRITERIA,
  computeSatisfactionStats,
  buildSatisfactionMonthlyTrend,
  buildCriteriaDistribution,
  parseScore,
  scoreGradeLabel,
} from '@/lib/satisfactionDashboardStats';
import { exportSatisfactionDashboardExcel } from '@/lib/satisfactionExcelExport';
import SatisfactionTrendCharts from '@/components/dashboard/satisfaction/SatisfactionTrendCharts';

const TREND_MONTH_OPTIONS = [3, 6, 12] as const;
const todayYmd = () => toYmdLocal(new Date());

function StatCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4" style={{ borderTopColor: accent, borderTopWidth: 4 }}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

const SatisfactionDashboardPage: React.FC = () => {
  const { hasPermission } = useAuth();
  /** ลบแบบประเมินได้เฉพาะ admin เท่านั้น ไม่มีการมอบสิทธิ์เพิ่มเติม (ตรงกับ backend ใน api/_handlers/issue-reports.ts) */
  const canDelete = hasPermission('admin');
  const [rows, setRows] = useState<IssueReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [trendMonths, setTrendMonths] = useState<(typeof TREND_MONTH_OPTIONS)[number]>(6);
  const [trendEndMonth, setTrendEndMonth] = useState(todayYmd());
  const [driverName, setDriverName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/issue-reports?category=satisfaction&limit=2000')
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setRows([]);
          return;
        }
        const data = (await r.json()) as unknown;
        setRows(Array.isArray(data) ? (data as IssueReportRow[]) : []);
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
  }, [refreshKey]);

  const driverOptions = useMemo(() => {
    const names = new Set(rows.map((r) => (r.data.driver_name ?? '').trim()).filter(Boolean));
    return [...names].sort().map((name) => ({ value: name, label: name }));
  }, [rows]);

  const filteredRows = useMemo(
    () => (driverName ? rows.filter((r) => (r.data.driver_name ?? '').trim() === driverName) : rows),
    [rows, driverName],
  );

  const stats = useMemo(() => computeSatisfactionStats(filteredRows), [filteredRows]);

  const monthlyCounts = useMemo(() => {
    const trend12 = buildSatisfactionMonthlyTrend(filteredRows, 2);
    return { current: trend12[1]?.count ?? 0, previous: trend12[0]?.count ?? 0 };
  }, [filteredRows]);

  const latestMonthTrendPercent =
    monthlyCounts.previous > 0
      ? Math.round(((monthlyCounts.current - monthlyCounts.previous) / monthlyCounts.previous) * 1000) / 10
      : null;

  const trendRows = useMemo(() => {
    const endKey = monthKey(trendEndMonth);
    return filteredRows.filter((r) => !r.report_date || monthKey(r.report_date) <= endKey);
  }, [filteredRows, trendEndMonth]);

  const trend = useMemo(() => buildSatisfactionMonthlyTrend(trendRows, trendMonths), [trendRows, trendMonths]);
  const distribution = useMemo(() => buildCriteriaDistribution(filteredRows), [filteredRows]);

  const sortedTableRows = useMemo(
    () => [...filteredRows].sort((a, b) => (b.report_date ?? '').localeCompare(a.report_date ?? '')),
    [filteredRows],
  );

  const handleExport = () => {
    setExporting(true);
    try {
      exportSatisfactionDashboardExcel(filteredRows);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (row: IssueReportRow) => {
    const label = `${row.data.vehicle_plate ?? '-'} — ${row.data.driver_name ?? '-'} (${row.report_date ?? '-'})`;
    if (!window.confirm(`ยืนยันลบแบบประเมินนี้?\n${label}\n\nการลบนี้ย้อนกลับไม่ได้`)) return;
    setDeletingId(row.id);
    try {
      const r = await apiFetch(`/api/issue-reports?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message || body.error || 'ลบไม่สำเร็จ');
      }
      setRows((prev) => prev.filter((r2) => r2.id !== row.id));
      toast.success('ลบแบบประเมินแล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">แบบประเมินความพึงพอใจ — Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              สรุปผลคะแนนความพึงพอใจของผู้ใช้บริการต่อพนักงานขับรถ{loading ? ' · กำลังโหลด…' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              รีเฟรช
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/complaints/satisfaction" target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                เปิดแบบฟอร์ม
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exporting || loading || filteredRows.length === 0}
              onClick={handleExport}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">ดูเฉพาะพนักงานขับรถ</span>
          <SearchablePicker
            value={driverName}
            onValueChange={setDriverName}
            options={driverOptions}
            placeholder="ทั้งหมด — พิมพ์ชื่อ พขร.…"
            aria-label="ดูเฉพาะพนักงานขับรถ"
            className="w-64"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="แบบประเมินทั้งหมด" value={`${stats.total} ใบ`} accent="#2563eb" />
          <StatCard
            label="คะแนนเฉลี่ยรวม"
            value={stats.overallAverage !== null ? `${stats.overallAverage} / 5` : 'ไม่มีข้อมูล'}
            sub={scoreGradeLabel(stats.overallAverage)}
            accent="#8b5cf6"
          />
          <StatCard label="ได้คะแนนดี-ดีเยี่ยม (4-5)" value={`${stats.goodPercent}%`} accent="#22c55e" />
          <StatCard label="ควรปรับปรุง (1-2)" value={`${stats.poorPercent}%`} accent="#ef4444" />
          <StatCard label="พนักงานขับรถที่ถูกประเมิน" value={`${stats.distinctDrivers} คน`} accent="#f59e0b" />
          <StatCard
            label="แบบประเมินเดือนนี้"
            value={`${monthlyCounts.current} ใบ`}
            sub={
              latestMonthTrendPercent === null
                ? undefined
                : `เทียบเดือนก่อน ${latestMonthTrendPercent > 0 ? '+' : ''}${latestMonthTrendPercent}%`
            }
            accent="#ec4899"
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-900">แนวโน้มรายเดือน</h2>
            <div className="flex flex-wrap items-center gap-2">
              <MonthNav value={trendEndMonth} onChange={setTrendEndMonth} disableNext />
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {TREND_MONTH_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTrendMonths(m)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      m === trendMonths ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {m} เดือน
                  </button>
                ))}
              </div>
            </div>
          </div>
          <SatisfactionTrendCharts
            trend={trend}
            criteriaAverages={stats.criteriaAverages}
            distribution={distribution}
            loading={loading}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-900">รายการแบบประเมิน ({sortedTableRows.length} ใบ)</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่ใช้บริการ</TableHead>
                  <TableHead>ทะเบียนรถ</TableHead>
                  <TableHead>ชื่อ พขร.</TableHead>
                  {SATISFACTION_CRITERIA.map((c) => (
                    <TableHead key={c.key} className="text-right">
                      {c.label}
                    </TableHead>
                  ))}
                  <TableHead>ข้อเสนอแนะ</TableHead>
                  {canDelete && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTableRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3 + SATISFACTION_CRITERIA.length + 1 + (canDelete ? 1 : 0)}
                      className="text-center text-sm text-muted-foreground py-6"
                    >
                      {loading ? 'กำลังโหลด…' : 'ไม่มีข้อมูล'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTableRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{r.report_date ?? '-'}</TableCell>
                      <TableCell>{r.data.vehicle_plate ?? '-'}</TableCell>
                      <TableCell>{r.data.driver_name ?? '-'}</TableCell>
                      {SATISFACTION_CRITERIA.map((c) => (
                        <TableCell key={c.key} className="text-right tabular-nums">
                          {parseScore(r.data[c.key]) ?? '-'}
                        </TableCell>
                      ))}
                      <TableCell className="max-w-xs truncate" title={r.data.suggestion ?? ''}>
                        {r.data.suggestion ?? '-'}
                      </TableCell>
                      {canDelete && (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingId === r.id}
                            onClick={() => handleDelete(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {deletingId === r.id ? 'กำลังลบ…' : 'ลบ'}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SatisfactionDashboardPage;
