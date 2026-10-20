import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wrench, UserX, CalendarOff, Gauge, type LucideIcon } from 'lucide-react';
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
import { computeComplaintsOverview, type IssueReportRow } from '@/lib/issueReportStats';

const PERIODS: PeriodKey[] = ['day', 'week', 'month', 'year'];

type BreakdownGroup = { key: string; label: string; items: BreakdownItem[] };

type PanelKey = 'vehicleService' | 'supervisorAbsent' | 'leave' | 'speed';

function BreakdownRow({ item, max }: { item: BreakdownItem; max: number }) {
  const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-600 truncate">{item.label}</span>
        <span className="font-semibold text-slate-900 tabular-nums shrink-0">{item.count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 4)}%` }} />
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
  onViewPeople,
}: {
  icon: LucideIcon;
  title: string;
  headline: number;
  headlineLabel: string;
  extraStats?: { label: string; value: number }[];
  breakdownGroups: BreakdownGroup[];
  onViewPeople: () => void;
}) {
  const [activeGroup, setActiveGroup] = useState(0);
  const group = breakdownGroups[activeGroup] ?? breakdownGroups[0];
  const max = Math.max(1, ...group.items.map((b) => b.count));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
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
            <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-base font-bold text-slate-900 tabular-nums">{s.value}</p>
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
                    i === activeGroup
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
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
            <BreakdownRow key={b.label} item={b} max={max} />
          ))}
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" className="mt-4 self-start" onClick={onViewPeople}>
        ดูรายชื่อ
      </Button>
    </div>
  );
}

function PeopleDialog({
  open,
  onOpenChange,
  title,
  people,
  usingMockData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  people: PersonCaseSummary[];
  usingMockData: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>เรียงจากจำนวนครั้งมากไปน้อย{usingMockData ? ' — ข้อมูลตัวอย่าง' : ''}</DialogDescription>
        </DialogHeader>
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

  const panelMeta = useMemo(
    () => ({
      vehicleService: { title: 'รถเข้าศูนย์', people: data.vehicleService.people },
      supervisorAbsent: { title: 'นายไม่อยู่', people: data.supervisorAbsent.people },
      leave: { title: 'การลา', people: data.leave.people },
      speed: { title: 'ความเร็ว', people: data.speed.people },
    }),
    [data],
  );

  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/complaints"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Complaints
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">ภาพรวม Complaints</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              สรุปข้อมูล 4 หมวด — รถเข้าศูนย์, นายไม่อยู่, การลา, ความเร็ว
              {loading ? ' · กำลังโหลด…' : usingMockData ? ' (ข้อมูลตัวอย่าง)' : ''}
            </p>
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 self-start">
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
            onViewPeople={() => setActivePanel('vehicleService')}
          />

          <PanelCard
            icon={UserX}
            title="นายไม่อยู่"
            headline={data.supervisorAbsent.totalPeople}
            headlineLabel="คนที่บิน"
            extraStats={[
              { label: 'วันที่บินรวม', value: data.supervisorAbsent.totalDaysAway },
              { label: 'วันที่ใช้ได้', value: data.supervisorAbsent.totalUsableDays },
            ]}
            breakdownGroups={[{ key: 'status', label: 'สถานะพนักงาน', items: data.supervisorAbsent.byStatus }]}
            onViewPeople={() => setActivePanel('supervisorAbsent')}
          />

          <PanelCard
            icon={CalendarOff}
            title="การลา"
            headline={data.leave.totalPeople}
            headlineLabel="คนที่ลา"
            breakdownGroups={[{ key: 'type', label: 'ประเภทการลา', items: data.leave.byLeaveType }]}
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
            onViewPeople={() => setActivePanel('speed')}
          />
        </div>
      </div>

      {activePanel ? (
        <PeopleDialog
          open
          onOpenChange={(open) => !open && setActivePanel(null)}
          title={`รายชื่อ — ${panelMeta[activePanel].title} (${PERIOD_LABELS[period]})`}
          people={panelMeta[activePanel].people}
          usingMockData={usingMockData}
        />
      ) : null}
    </main>
  );
};

export default ComplaintsOverviewPage;
