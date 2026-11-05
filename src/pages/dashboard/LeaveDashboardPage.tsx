import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TopStatCard from '@/components/dashboard/shared/TopStatCard';
import CategoryBreakdownChart from '@/components/dashboard/shared/CategoryBreakdownChart';
import LeaveMonthlyTrendChart from '@/components/dashboard/leaves/LeaveMonthlyTrendChart';
import LeaveRecordTable from '@/components/dashboard/leaves/LeaveRecordTable';
import DetailListDialog from '@/components/shared/DetailListDialog';
import ExportExcelButton from '@/components/shared/ExportExcelButton';
import { apiFetch } from '@/lib/apiFetch';
import { buildMonthlyTrend } from '@/lib/caseReportStats';
import type { IssueReportRow } from '@/lib/issueReportStats';
import {
  buildLeaveDataset,
  countByLeaveType,
  countDistinctEmployees,
  formatLeaveDate,
  groupLeaveByEmployee,
  leaveRecordName,
  topLeaveType,
  type LeaveDataset,
  type LeaveRecord,
  type LeaveType,
} from '@/lib/leaveDashboard';
import { exportLeavesExcel } from '@/lib/leaveExcelExport';
import type { Employee } from '@/types';

/** เพดานต่อหน้าของแต่ละ API — ดึงจนครบ เพื่อไม่ให้ยอดสถิติขาดโดยไม่รู้ตัว */
const LEAVE_PAGE_SIZE = 2000;
const EMPLOYEE_PAGE_SIZE = 500;

async function fetchAllPages<T extends { id: string }>(path: string, pageSize: number): Promise<T[]> {
  const byId = new Map<string, T>();
  const separator = path.includes('?') ? '&' : '?';
  for (let offset = 0; ; offset += pageSize) {
    const r = await apiFetch(`${path}${separator}limit=${pageSize}&offset=${offset}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const batch = (await r.json()) as T[];
    batch.forEach((row) => byId.set(row.id, row));
    if (batch.length < pageSize) return [...byId.values()];
  }
}

const EMPTY_DATASET: LeaveDataset = { records: [], excludedNotCommon: 0, excludedUnmatched: 0 };

const TYPE_TONE: Record<LeaveType, React.ComponentProps<typeof TopStatCard>['tone']> = {
  พักร้อน: 'blue',
  ลาป่วย: 'blue',
  ลากิจ: 'blue',
  ลาพิเศษ: 'blue',
  'Day Off': 'blue',
  เปลี่ยนตัว: 'orange',
  เกษียณ: 'red',
  ลาออก: 'red',
  อื่นๆ: 'neutral',
};

type DrilldownState =
  | { view: 'types' }
  | { view: 'employees' }
  | { view: 'records'; title: string; records: LeaveRecord[]; back?: 'types' | 'employees' }
  | null;

const LeaveDashboardPage: React.FC = () => {
  const [dataset, setDataset] = useState<LeaveDataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    Promise.all([
      fetchAllPages<IssueReportRow>('/api/issue-reports?category=leave', LEAVE_PAGE_SIZE),
      fetchAllPages<Employee>('/api/employees', EMPLOYEE_PAGE_SIZE),
    ])
      .then(([rows, employees]) => {
        if (!cancelled) setDataset(buildLeaveDataset(rows, employees));
      })
      .catch(() => {
        if (cancelled) return;
        setDataset(EMPTY_DATASET);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const { records, excludedNotCommon, excludedUnmatched } = dataset;
  const excludedTotal = excludedNotCommon + excludedUnmatched;

  const typeBuckets = useMemo(() => countByLeaveType(records), [records]);
  const topType = useMemo(() => topLeaveType(records), [records]);
  const distinctEmployees = useMemo(() => countDistinctEmployees(records), [records]);
  const employeeGroups = useMemo(() => groupLeaveByEmployee(records), [records]);
  const trend = useMemo(
    () => buildMonthlyTrend(records.flatMap((r) => (r.date ? [r.date] : []))),
    [records],
  );
  const missingEnglishName = useMemo(() => records.filter((r) => !r.englishName).length, [records]);

  function recordsOfType(type: string): LeaveRecord[] {
    return records.filter((r) => r.leaveType === type);
  }

  function openType(type: string, back?: 'types') {
    const matched = recordsOfType(type);
    setDrilldown({ view: 'records', title: `${type} (${matched.length} รายการ)`, records: matched, back });
  }

  function percentOf(count: number): number {
    return records.length > 0 ? Math.round((count / records.length) * 100) : 0;
  }

  const dialogTitle =
    drilldown?.view === 'types'
      ? `ประเภทการลา — ทั้งหมด ${records.length} รายการ`
      : drilldown?.view === 'employees'
        ? `พนักงานที่ลา — ${distinctEmployees} คน`
        : drilldown?.view === 'records'
          ? drilldown.title
          : '';

  const dialogItems =
    drilldown?.view === 'types'
      ? typeBuckets.map((bucket) => ({
          id: bucket.label,
          title: bucket.label,
          badge: `${bucket.count} รายการ, ${percentOf(bucket.count)}%`,
          onClick: () => openType(bucket.label, 'types'),
        }))
      : drilldown?.view === 'employees'
        ? employeeGroups.map((group) => ({
            id: group.employeeId,
            title: group.name,
            subtitle: group.employeeCode,
            badge: `${group.records.length} รายการ`,
            onClick: () =>
              setDrilldown({
                view: 'records',
                title: `${group.employeeCode} · ${group.name} (${group.records.length} รายการ)`,
                records: group.records,
                back: 'employees',
              }),
          }))
        : drilldown?.view === 'records'
          ? drilldown.records.map((r) => ({
              id: r.id,
              title: leaveRecordName(r),
              subtitle: [r.employeeCode, formatLeaveDate(r.date), r.reason].filter(Boolean).join(' · '),
              badge: r.leaveType,
            }))
          : [];

  const dialogBack = drilldown?.view === 'records' ? drilldown.back : undefined;

  return (
    <div className="-mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-6 bg-[#f8fafc] min-h-[calc(100dvh-3rem)]">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">สรุปการลา</h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              ภาพรวมการลาของพนักงาน Common แยกตามประเภท แนวโน้มรายเดือน และรายการทั้งหมด นับเป็นจำนวนครั้งที่แจ้งลา
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
            <ExportExcelButton
              className="bg-white"
              onClick={() => exportLeavesExcel(records)}
              disabled={loading || records.length === 0}
            />
          </div>
        </div>

        {failed ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            โหลดข้อมูลไม่สำเร็จ ตัวเลขในหน้านี้จึงยังไม่ถูกต้อง กรุณากดรีเฟรช
          </div>
        ) : null}

        {!loading && !failed && (excludedTotal > 0 || missingEnglishName > 0) ? (
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
            <div className="space-y-0.5">
              {excludedTotal > 0 ? (
                <p>
                  ไม่นับ {excludedTotal} รายการ: ตำแหน่งปัจจุบันไม่ใช่ Common {excludedNotCommon} รายการ
                  และจับคู่กับทะเบียนพนักงานไม่ได้ {excludedUnmatched} รายการ
                </p>
              ) : null}
              {missingEnglishName > 0 ? (
                <p>{missingEnglishName} รายการยังไม่มีชื่ออังกฤษในทะเบียน จึงแสดงชื่อไทยแทน</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <TopStatCard
            index={1}
            title="รายการลาทั้งหมด"
            value={String(records.length)}
            loading={loading}
            emphasize
            onClick={() =>
              setDrilldown({ view: 'records', title: `รายการลาทั้งหมด (${records.length} รายการ)`, records })
            }
          />
          <TopStatCard
            index={2}
            title="พนักงานที่ลา (คน)"
            value={String(distinctEmployees)}
            loading={loading}
            emphasize
            onClick={() => setDrilldown({ view: 'employees' })}
          />
          <TopStatCard
            index={3}
            title="ประเภทการลาที่พบมากสุด"
            value={
              topType
                ? `${topType.label} (${topType.count} รายการ, ${percentOf(topType.count)}%)`
                : 'ไม่มีข้อมูล'
            }
            loading={loading}
            tone="yellow"
            onClick={() => setDrilldown({ view: 'types' })}
          />
          {typeBuckets.map((bucket, i) => (
            <TopStatCard
              key={bucket.label}
              index={i + 4}
              title={bucket.label}
              value={String(bucket.count)}
              loading={loading}
              tone={TYPE_TONE[bucket.label as LeaveType]}
              onClick={() => openType(bucket.label)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LeaveMonthlyTrendChart
            title="แนวโน้มการลารายเดือน"
            subtitle="จำนวนครั้งที่แจ้งลา — 6 เดือนล่าสุด"
            data={trend}
            loading={loading}
          />
          <CategoryBreakdownChart
            title="ประเภทการลา"
            subtitle="แยกตามประเภท ครบทุกประเภท"
            buckets={typeBuckets}
            loading={loading}
            color="#2a78d6"
          />
        </div>

        <LeaveRecordTable records={records} loading={loading} />
      </div>

      <DetailListDialog
        open={drilldown !== null}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
        title={dialogTitle}
        items={dialogItems}
        onBack={dialogBack ? () => setDrilldown({ view: dialogBack }) : undefined}
      />
    </div>
  );
};

export default LeaveDashboardPage;
