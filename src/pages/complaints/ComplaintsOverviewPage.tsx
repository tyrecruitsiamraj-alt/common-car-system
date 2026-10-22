import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, UserX, CalendarOff, Gauge, FileSpreadsheet, History, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiFetch';
import { isDemoMode } from '@/lib/demoMode';
import {
  COMPLAINTS_OVERVIEW_MOCK,
  PERIOD_LABELS,
  type PeriodKey,
  type BreakdownItem,
  type PersonCaseSummary,
} from '@/lib/complaintsOverviewMockData';
import { computeComplaintsOverview, filterByPeriod, daysInclusive, type IssueReportRow } from '@/lib/issueReportStats';
import { exportComplaintsOverviewExcel } from '@/lib/complaintsExcelExport';
import { ISSUE_REPORT_TYPES, type IssueField } from '@/lib/issueReportConfig';

const PERIODS: PeriodKey[] = ['day', 'week', 'month', 'year'];

type BreakdownGroup = { key: string; label: string; items: BreakdownItem[] };

type PanelKey = 'vehicleService' | 'supervisorAbsent' | 'leave' | 'speed';

type Accent = { base: string; tint: string };

const CATEGORY_ACCENT: Record<string, Accent> = {
  'vehicle-service': { base: '#2563eb', tint: '#eaf1ff' },
  'supervisor-absent': { base: '#d97706', tint: '#fff7e6' },
  leave: { base: '#16a34a', tint: '#eafbf0' },
  speed: { base: '#dc2626', tint: '#fdeceb' },
};

/** ค่าของฟิลด์หนึ่งในฟอร์มแจ้ง ตามคีย์/ชนิดที่กำหนดไว้ใน issueReportConfig — ใช้แสดงรายละเอียดรายเคสในป๊อปอัป */
function getIssueFieldValue(row: IssueReportRow, field: IssueField): string {
  if (field.type === 'computed-days' && field.computeDaysFrom) {
    const { startKey, endKey, subtractDays = 0 } = field.computeDaysFrom;
    const total = daysInclusive(row.data[startKey], row.data[endKey]);
    if (total <= 0) return '-';
    return `${Math.max(0, total - subtractDays)} วัน`;
  }
  let value = row.data[field.key];
  if (field.otherTrigger && value === field.otherTrigger && field.otherField) {
    value = row.data[field.otherField.key] || value;
  }
  if (!value) {
    if (field.key === 'employee_name') value = row.employee_name;
    else if (field.key === 'position') value = row.position;
    else if (field.key === 'report_date') value = row.report_date;
  }
  return value && value.trim() ? value : '-';
}

function BreakdownRow({ item, max, accent }: { item: BreakdownItem; max: number; accent: string }) {
  const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-600 truncate">{item.label}</span>
        <span className="font-semibold text-slate-900 tabular-nums shrink-0">{item.count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: accent }} />
      </div>
    </div>
  );
}

function PanelCard({
  icon: Icon,
  title,
  headline,
  headlineLabel,
  extraStats,
  breakdownGroups,
  accent,
  onViewPeople,
}: {
  icon: LucideIcon;
  title: string;
  headline: number;
  headlineLabel: string;
  extraStats?: { label: string; value: number }[];
  breakdownGroups: BreakdownGroup[];
  accent: Accent;
  onViewPeople: () => void;
}) {
  const [activeGroup, setActiveGroup] = useState(0);
  const group = breakdownGroups[activeGroup] ?? breakdownGroups[0];
  const max = Math.max(1, ...group.items.map((b) => b.count));

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col"
      style={{ borderTopColor: accent.base, borderTopWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: accent.tint, color: accent.base }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
            <p className="text-xs text-slate-500 truncate">{headlineLabel}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-950 tabular-nums shrink-0">{headline}</p>
      </div>

      {extraStats && extraStats.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {extraStats.map((s) => (
            <div key={s.label} className="rounded-xl px-3 py-2" style={{ backgroundColor: accent.tint }}>
              <p className="text-base font-bold tabular-nums" style={{ color: accent.base }}>
                {s.value}
              </p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex-1">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">สรุปแยกตาม</p>
          {breakdownGroups.length > 1 ? (
            <div className="flex gap-1">
              {breakdownGroups.map((g, i) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGroup(i)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                    i === activeGroup ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                  style={i === activeGroup ? { backgroundColor: accent.base } : undefined}
                >
                  {g.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">{group.label}</span>
          )}
        </div>
        <div className="space-y-2.5">
          {group.items.map((b) => (
            <BreakdownRow key={b.label} item={b} max={max} accent={accent.base} />
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 self-start"
        style={{ borderColor: accent.base, color: accent.base }}
        onClick={onViewPeople}
      >
        ดูเคสทั้งหมด
      </Button>
    </div>
  );
}

function CaseDetailDialog({
  open,
  onOpenChange,
  title,
  categorySlug,
  people,
  caseRows,
  fields,
  accent,
  usingMockData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  categorySlug: string;
  people: PersonCaseSummary[];
  caseRows: IssueReportRow[];
  fields: IssueField[];
  accent: Accent;
  usingMockData: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {usingMockData
              ? 'เรียงจากจำนวนครั้งมากไปน้อย — ข้อมูลตัวอย่าง'
              : `ตามหัวข้อในฟอร์มแจ้ง · ทั้งหมด ${caseRows.length} เคส`}
          </DialogDescription>
        </DialogHeader>

        {usingMockData ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>ตำแหน่ง</TableHead>
                <TableHead className="text-right">จำนวนครั้ง</TableHead>
                <TableHead>รายละเอียด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.position}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{p.count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.cases.join(' · ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-3">
            {caseRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีเคสในช่วงที่เลือก</p>
            ) : (
              caseRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-200 p-4"
                  style={{ borderLeftColor: accent.base, borderLeftWidth: 4, backgroundColor: accent.tint }}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {row.employee_name || '-'}
                      {row.report_date ? ` · ${row.report_date}` : ''}
                    </p>
                    {row.employee_name ? (
                      <Button type="button" variant="ghost" size="sm" asChild>
                        <Link
                          to={`/complaints/history?employee=${encodeURIComponent(row.employee_name)}&category=${categorySlug}`}
                        >
                          ดูประวัติ
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                    {fields.map((f) => (
                      <div key={f.key}>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">{f.label}</p>
                        <p className="text-sm font-medium text-slate-800">{getIssueFieldValue(row, f)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const ComplaintsOverviewPage: React.FC = () => {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [rows, setRows] = useState<IssueReportRow[]>([]);
  const [loading, setLoading] = useState(!isDemoMode());

  useEffect(() => {
    if (isDemoMode()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/issue-reports')
      .then(async (r) => {
        if (cancelled || !r.ok) return;
        const json = (await r.json()) as unknown;
        if (!cancelled) setRows(Array.isArray(json) ? (json as IssueReportRow[]) : []);
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

  const usingMockData = isDemoMode() && rows.length === 0;
  const data = useMemo(
    () => (usingMockData ? COMPLAINTS_OVERVIEW_MOCK[period] : computeComplaintsOverview(rows, period)),
    [usingMockData, rows, period],
  );

  const caseRowsBySlug = useMemo(() => {
    const bySlug: Record<string, IssueReportRow[]> = {};
    for (const type of ISSUE_REPORT_TYPES) {
      bySlug[type.slug] = filterByPeriod(
        rows.filter((r) => r.category === type.slug),
        period,
      ).sort((a, b) => (b.report_date ?? '').localeCompare(a.report_date ?? ''));
    }
    return bySlug;
  }, [rows, period]);

  const panelMeta = useMemo(
    () => ({
      vehicleService: {
        title: 'รถเข้าศูนย์',
        slug: 'vehicle-service',
        people: data.vehicleService.people,
        accent: CATEGORY_ACCENT['vehicle-service'],
      },
      supervisorAbsent: {
        title: 'นายบิน',
        slug: 'supervisor-absent',
        people: data.supervisorAbsent.people,
        accent: CATEGORY_ACCENT['supervisor-absent'],
      },
      leave: { title: 'การลา', slug: 'leave', people: data.leave.people, accent: CATEGORY_ACCENT.leave },
      speed: { title: 'ความเร็ว', slug: 'speed', people: data.speed.people, accent: CATEGORY_ACCENT.speed },
    }),
    [data],
  );

  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">ภาพรวมแบบฟอร์ม</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              สรุปข้อมูล 4 หมวด — รถเข้าศูนย์, นายบิน, การลา, ความเร็ว
              {loading ? ' · กำลังโหลด…' : usingMockData ? ' (ข้อมูลตัวอย่าง)' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    p === period ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/complaints/history">
                <History className="h-3.5 w-3.5 mr-1.5" />
                ประวัติพนักงาน/ผู้แจ้ง
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={usingMockData || rows.length === 0}
              onClick={() => exportComplaintsOverviewExcel(rows, period)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <PanelCard
            icon={Wrench}
            title="รถเข้าศูนย์"
            headline={data.vehicleService.total}
            headlineLabel="คันที่เข้าศูนย์"
            extraStats={[
              { label: 'ยกเลิก', value: data.vehicleService.cancelled },
              { label: 'เลื่อน', value: data.vehicleService.postponed },
            ]}
            breakdownGroups={[
              { key: 'model', label: 'รุ่นรถ', items: data.vehicleService.byModel },
              { key: 'center', label: 'ศูนย์', items: data.vehicleService.byCenter },
              { key: 'type', label: 'ประเภท', items: data.vehicleService.byServiceType },
            ]}
            accent={CATEGORY_ACCENT['vehicle-service']}
            onViewPeople={() => setActivePanel('vehicleService')}
          />

          <PanelCard
            icon={UserX}
            title="นายบิน"
            headline={data.supervisorAbsent.totalPeople}
            headlineLabel="คนที่บิน"
            extraStats={[
              { label: 'วันที่บินรวม', value: data.supervisorAbsent.totalDaysAway },
              { label: 'วันที่ใช้ได้', value: data.supervisorAbsent.totalUsableDays },
            ]}
            breakdownGroups={[{ key: 'status', label: 'สถานะพนักงาน', items: data.supervisorAbsent.byStatus }]}
            accent={CATEGORY_ACCENT['supervisor-absent']}
            onViewPeople={() => setActivePanel('supervisorAbsent')}
          />

          <PanelCard
            icon={CalendarOff}
            title="การลา"
            headline={data.leave.totalPeople}
            headlineLabel="คนที่ลา"
            breakdownGroups={[{ key: 'type', label: 'ประเภทการลา', items: data.leave.byLeaveType }]}
            accent={CATEGORY_ACCENT.leave}
            onViewPeople={() => setActivePanel('leave')}
          />

          <PanelCard
            icon={Gauge}
            title="ความเร็ว"
            headline={data.speed.overLimitCount}
            headlineLabel="ครั้งที่เกิน 120 กม./ชม."
            breakdownGroups={[
              { key: 'repeat', label: 'การเกิดซ้ำ', items: data.speed.byRepeat },
              { key: 'reason', label: 'สาเหตุ', items: data.speed.byReason },
            ]}
            accent={CATEGORY_ACCENT.speed}
            onViewPeople={() => setActivePanel('speed')}
          />
        </div>
      </div>

      {activePanel ? (
        <CaseDetailDialog
          open
          onOpenChange={(open) => !open && setActivePanel(null)}
          title={`รายละเอียด — ${panelMeta[activePanel].title} (${PERIOD_LABELS[period]})`}
          categorySlug={panelMeta[activePanel].slug}
          people={panelMeta[activePanel].people}
          caseRows={caseRowsBySlug[panelMeta[activePanel].slug] ?? []}
          fields={ISSUE_REPORT_TYPES.find((t) => t.slug === panelMeta[activePanel].slug)?.fields ?? []}
          accent={panelMeta[activePanel].accent}
          usingMockData={usingMockData}
        />
      ) : null}
    </main>
  );
};

export default ComplaintsOverviewPage;
