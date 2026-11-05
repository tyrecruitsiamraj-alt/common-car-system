import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, ExternalLink, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TopStatCard from '@/components/dashboard/shared/TopStatCard';
import CategoryBreakdownChart from '@/components/dashboard/shared/CategoryBreakdownChart';
import IssueReportEditDialog from '@/components/complaints/IssueReportEditDialog';
import LeaveDailyTrendChart from '@/components/dashboard/leaves/LeaveDailyTrendChart';
import LeaveFilterBar from '@/components/dashboard/leaves/LeaveFilterBar';
import LeaveTrendChart from '@/components/dashboard/leaves/LeaveTrendChart';
import LeaveRecordTable from '@/components/dashboard/leaves/LeaveRecordTable';
import DetailListDialog from '@/components/shared/DetailListDialog';
import ExportExcelButton from '@/components/shared/ExportExcelButton';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { buildMonthlyTrend } from '@/lib/caseReportStats';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import type { IssueReportRow } from '@/lib/issueReportStats';
import {
  EMPTY_LEAVE_FILTERS,
  applyLeaveFilters,
  buildLeaveDataset,
  countByLeaveType,
  countDistinctEmployees,
  formatLeaveDate,
  groupLeaveByEmployee,
  leaveRecordName,
  topLeaveType,
  withoutDateFilter,
  type LeaveDataset,
  type LeaveFilters,
  type LeaveRecord,
  type LeaveType,
} from '@/lib/leaveDashboard';
import { exportLeavesExcel } from '@/lib/leaveExcelExport';
import type { DriverTmaProfile, Employee } from '@/types';

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

/** รับข้อมูลใหม่อัตโนมัติเมื่อกลับมาจากแท็บฟอร์ม แต่ไม่ถี่กว่านี้ */
const AUTO_REFRESH_MIN_MS = 15_000;
const LEAVE_FORM_PATH = '/complaints/leave';
const LEAVE_FORM_CONFIG = ISSUE_REPORT_TYPES.find((t) => t.slug === 'leave');

/** ข้อมูล Line และรูปคนขับเป็นข้อมูลเสริม ถ้าโหลดไม่ได้หน้ายังต้องใช้งานได้ */
async function fetchTmaProfiles(): Promise<DriverTmaProfile[]> {
  try {
    const r = await apiFetch('/api/driver-tma-profiles');
    if (!r.ok) return [];
    const data = (await r.json()) as unknown;
    return Array.isArray(data) ? (data as DriverTmaProfile[]) : [];
  } catch {
    return [];
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
  const [reload, setReload] = useState({ key: 0, silent: false });
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);
  const [filters, setFilters] = useState<LeaveFilters>(EMPTY_LEAVE_FILTERS);
  const [editing, setEditing] = useState<LeaveRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const lastLoadedAt = useRef(0);
  const { hasPermission } = useAuth();
  const canManage = hasPermission('supervisor');

  useEffect(() => {
    let cancelled = false;
    if (!reload.silent) setLoading(true);
    Promise.all([
      fetchAllPages<IssueReportRow>('/api/issue-reports?category=leave', LEAVE_PAGE_SIZE),
      fetchAllPages<Employee>('/api/employees', EMPLOYEE_PAGE_SIZE),
      fetchTmaProfiles(),
    ])
      .then(([rows, employees, profiles]) => {
        if (cancelled) return;
        setDataset(buildLeaveDataset(rows, employees, profiles));
        setFailed(false);
        lastLoadedAt.current = Date.now();
      })
      .catch(() => {
        // รีเฟรชเบื้องหลังล้มเหลวให้คงข้อมูลเดิมไว้ ไม่ล้างหน้าจอ
        if (cancelled || reload.silent) return;
        setDataset(EMPTY_DATASET);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  /** กลับมาจากแท็บฟอร์มแจ้งลาแล้วเห็นรายการใหม่ได้โดยไม่ต้องกดรีเฟรช */
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastLoadedAt.current < AUTO_REFRESH_MIN_MS) return;
      setReload((r) => ({ key: r.key + 1, silent: true }));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const reloadSilently = () => setReload((r) => ({ key: r.key + 1, silent: true }));

  const allRecords = dataset.records;
  const { excludedNotCommon, excludedUnmatched } = dataset;
  const excludedTotal = excludedNotCommon + excludedUnmatched;
  const records = useMemo(() => applyLeaveFilters(allRecords, filters), [allRecords, filters]);
  /** กราฟรายวันและรายเดือนกำหนดช่วงวันที่เอง จึงใช้เฉพาะตัวกรองอื่น */
  const recordsAnyDate = useMemo(
    () => applyLeaveFilters(allRecords, withoutDateFilter(filters)),
    [allRecords, filters],
  );

  const typeBuckets = useMemo(() => countByLeaveType(records), [records]);
  const topType = useMemo(() => topLeaveType(records), [records]);
  const distinctEmployees = useMemo(() => countDistinctEmployees(records), [records]);
  const employeeGroups = useMemo(() => groupLeaveByEmployee(records), [records]);
  const trend = useMemo(
    () => buildMonthlyTrend(recordsAnyDate.flatMap((r) => (r.date ? [r.date] : []))),
    [recordsAnyDate],
  );
  const missingEnglishName = useMemo(() => records.filter((r) => !r.englishName).length, [records]);

  function recordsOfType(type: string): LeaveRecord[] {
    return records.filter((r) => r.leaveType === type);
  }

  function openType(type: string, back?: 'types') {
    const matched = recordsOfType(type);
    setDrilldown({ view: 'records', title: `${type} (${matched.length} รายการ)`, records: matched, back });
  }

  function openDay(ymd: string) {
    const matched = recordsAnyDate.filter((r) => r.date === ymd);
    setDrilldown({
      view: 'records',
      title: `${formatLeaveDate(ymd)} (${matched.length} รายการ)`,
      records: matched,
    });
  }

  async function handleDelete(record: LeaveRecord) {
    const label = `${leaveRecordName(record)} — ${record.leaveType} (${formatLeaveDate(record.date)})`;
    if (!window.confirm(`ยืนยันลบรายการลานี้?\n${label}\n\nการลบนี้ย้อนกลับไม่ได้`)) return;
    setDeletingId(record.id);
    try {
      const r = await apiFetch(`/api/issue-reports?id=${encodeURIComponent(record.id)}`, { method: 'DELETE' });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message || body.error || 'ลบไม่สำเร็จ');
      }
      toast.success('ลบรายการลาแล้ว');
      reloadSilently();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
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
              ภาพรวมการลาของพนักงาน Common แยกตามประเภทและแนวโน้ม นับเป็นจำนวนครั้งที่แจ้งลา
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              onClick={() => setReload((r) => ({ key: r.key + 1, silent: false }))}
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
            <Button type="button" variant="outline" className="bg-white" asChild>
              <Link to={LEAVE_FORM_PATH} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                เปิดฟอร์มแจ้งลา
              </Link>
            </Button>
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

        <LeaveFilterBar
          records={allRecords}
          filters={filters}
          onChange={setFilters}
          matchedCount={records.length}
        />

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

        <LeaveDailyTrendChart
          records={recordsAnyDate}
          from={filters.from}
          to={filters.to}
          loading={loading}
          onOpenDay={openDay}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LeaveTrendChart
            title="แนวโน้มการลารายเดือน"
            subtitle="6 เดือนล่าสุดเสมอ ไม่ขึ้นกับช่วงวันที่ที่เลือก"
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

        <LeaveRecordTable
          records={records}
          loading={loading}
          canManage={canManage}
          deletingId={deletingId}
          onEdit={setEditing}
          onDelete={(record) => void handleDelete(record)}
        />
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

      {editing && LEAVE_FORM_CONFIG ? (
        <IssueReportEditDialog
          key={editing.id}
          row={editing.source}
          config={LEAVE_FORM_CONFIG}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSaved={() => {
            setEditing(null);
            reloadSilently();
          }}
        />
      ) : null}
    </div>
  );
};

export default LeaveDashboardPage;
