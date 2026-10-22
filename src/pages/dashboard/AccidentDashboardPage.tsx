import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TopStatCard from '@/components/dashboard/shared/TopStatCard';
import CategoryBreakdownChart from '@/components/dashboard/shared/CategoryBreakdownChart';
import MonthlyTrendChart from '@/components/dashboard/shared/MonthlyTrendChart';
import AccidentCaseTable from '@/components/dashboard/accidents/AccidentCaseTable';
import DetailListDialog from '@/components/shared/DetailListDialog';
import { apiFetch } from '@/lib/apiFetch';
import {
  breakdownValues,
  bucketEmployeeAge,
  bucketTopCategories,
  bucketYearsOfService,
  buildMonthlyTrend,
  countDistinctValues,
  getEmployeeAgeLabel,
  getYearsOfServiceLabel,
  mostCommonValue,
  type TopValueSummary,
} from '@/lib/caseReportStats';
import type { AccidentCase } from '@/types';

function formatTopValue(top: TopValueSummary | null, unit = 'เคส'): string {
  return top ? `${top.label} (${top.count} ${unit}, ${top.percent}%)` : 'ไม่มีข้อมูล';
}

function formatCaseDate(ymd: string): string {
  try {
    return format(parseISO(ymd), 'd MMM yyyy', { locale: th });
  } catch {
    return ymd;
  }
}

/** ฟิลด์ที่กดกล่อง "พบมากสุด" แล้วเปิดดู breakdown ของทุกค่าได้ */
type FieldKey =
  | 'accidentType'
  | 'rootCause'
  | 'yearsOfService'
  | 'employeeAge'
  | 'timeRange'
  | 'workDayType'
  | 'locationDetail'
  | 'vehicleModel'
  | 'jobType'
  | 'causeDetail'
  | 'employeeName';

const FIELD_CONFIG: Record<FieldKey, { title: string; getLabel: (c: AccidentCase) => string | null }> = {
  accidentType: { title: 'ประเภทอุบัติเหตุ', getLabel: (c) => c.accident_type?.trim() || null },
  rootCause: { title: 'ต้นเหตุ', getLabel: (c) => c.root_cause?.trim() || null },
  yearsOfService: { title: 'ช่วงอายุงาน', getLabel: (c) => getYearsOfServiceLabel(c.years_of_service) },
  employeeAge: { title: 'ช่วงอายุพนักงาน', getLabel: (c) => getEmployeeAgeLabel(c.employee_age) },
  timeRange: { title: 'ช่วงเวลา', getLabel: (c) => c.time_range?.trim() || null },
  workDayType: { title: 'วันทำงาน / วันหยุด', getLabel: (c) => c.work_day_type?.trim() || null },
  locationDetail: { title: 'จุดเกิดเหตุ', getLabel: (c) => c.location_detail?.trim() || null },
  vehicleModel: { title: 'รุ่นรถ', getLabel: (c) => c.vehicle_model?.trim() || null },
  jobType: { title: 'ลักษณะงาน', getLabel: (c) => c.job_type?.trim() || null },
  causeDetail: { title: 'รายละเอียด', getLabel: (c) => c.cause_detail?.trim() || null },
  employeeName: { title: 'พนักงาน', getLabel: (c) => c.employee_name?.trim() || null },
};

type DrilldownState =
  | { view: 'breakdown'; field: FieldKey }
  | { view: 'cases'; title: string; cases: AccidentCase[]; backField?: FieldKey }
  | null;

const AccidentDashboardPage: React.FC = () => {
  const [cases, setCases] = useState<AccidentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/accident-cases')
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setCases([]);
          return;
        }
        const data = (await r.json()) as unknown;
        setCases(Array.isArray(data) ? (data as AccidentCase[]) : []);
      })
      .catch(() => {
        if (!cancelled) setCases([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const topStats = useMemo(() => {
    const total = cases.length;
    return {
      total,
      distinctEmployees: countDistinctValues(cases.map((c) => c.employee_name)),
      accidentType: mostCommonValue(cases.map((c) => c.accident_type), total),
      rootCause: mostCommonValue(cases.map((c) => c.root_cause), total),
      yearsOfService: bucketYearsOfService(cases.map((c) => c.years_of_service)),
      employeeAge: bucketEmployeeAge(cases.map((c) => c.employee_age)),
      timeRange: mostCommonValue(cases.map((c) => c.time_range), total),
      workDayType: mostCommonValue(cases.map((c) => c.work_day_type), total),
      locationDetail: mostCommonValue(cases.map((c) => c.location_detail), total),
      vehicleModel: mostCommonValue(cases.map((c) => c.vehicle_model), total),
      jobType: mostCommonValue(cases.map((c) => c.job_type), total),
      causeDetail: mostCommonValue(cases.map((c) => c.cause_detail), total),
    };
  }, [cases]);

  /** แยกจำนวนเคสตาม "สถานะเคส" — นับตรงตัว (ไม่จัดกลุ่ม top-N) เพราะเป็นค่าคงที่จำกัดจำนวน ไม่ใช่ free text หางยาว */
  const caseStatusCounts = useMemo(() => {
    const countOf = (status: string) => cases.filter((c) => (c.case_status ?? '').trim() === status).length;
    return {
      atFault: countOf('ฝ่ายผิด'),
      atFaultUncounted: countOf('ฝ่ายผิดไม่นับเคส'),
      notAtFault: countOf('ฝ่ายถูก'),
    };
  }, [cases]);

  const accidentTypeBuckets = useMemo(
    () => bucketTopCategories(cases.map((c) => c.accident_type)),
    [cases],
  );
  const rootCauseBuckets = useMemo(
    () => bucketTopCategories(cases.map((c) => c.root_cause)),
    [cases],
  );
  const trend = useMemo(() => buildMonthlyTrend(cases.map((c) => c.case_date)), [cases]);

  function openBreakdown(field: FieldKey) {
    setDrilldown({ view: 'breakdown', field });
  }

  function openCaseStatusList(title: string, status: string) {
    setDrilldown({
      view: 'cases',
      title,
      cases: cases.filter((c) => (c.case_status ?? '').trim() === status),
    });
  }

  function openAllCases() {
    setDrilldown({ view: 'cases', title: `เคสทั้งหมด (${cases.length} เคส)`, cases });
  }

  const dialogOpen = drilldown !== null;
  const dialogTitle =
    drilldown?.view === 'breakdown'
      ? `${FIELD_CONFIG[drilldown.field].title} — ทั้งหมด ${cases.length} เคส`
      : drilldown?.view === 'cases'
        ? drilldown.title
        : '';

  const dialogItems =
    drilldown?.view === 'breakdown'
      ? breakdownValues(cases.map(FIELD_CONFIG[drilldown.field].getLabel), cases.length).map((row) => {
          const field = drilldown.field;
          return {
            id: row.label,
            title: row.label,
            badge: `${row.count} เคส, ${row.percent}%`,
            onClick: () =>
              setDrilldown({
                view: 'cases',
                title: `${FIELD_CONFIG[field].title}: ${row.label} (${row.count} เคส)`,
                cases: cases.filter((c) => FIELD_CONFIG[field].getLabel(c) === row.label),
                backField: field,
              }),
          };
        })
      : drilldown?.view === 'cases'
        ? drilldown.cases.map((c) => ({
            id: c.id,
            title: c.employee_name || 'ไม่ระบุชื่อ',
            subtitle: [formatCaseDate(c.case_date), c.vehicle_model].filter(Boolean).join(' · '),
            badge: c.case_status || undefined,
            badgeVariant: (c.case_status === 'ฝ่ายผิด'
              ? 'destructive'
              : c.case_status === 'ฝ่ายถูก'
                ? 'success'
                : 'default') as const,
          }))
        : [];

  return (
    <div className="-mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-6 bg-[#f8fafc] min-h-[calc(100dvh-3rem)]">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              สรุปเคสอุบัติเหตุ
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              ภาพรวมเคสอุบัติเหตุที่มีการแจ้งเข้ามา — สาเหตุที่พบบ่อย แนวโน้มรายเดือน และรายการเคสทั้งหมด
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button type="button" variant="outline" className="bg-white" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
            <Button type="button" variant="outline" className="bg-white" asChild>
              <Link to="/accidents/report" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                เปิดฟอร์มแจ้งเหตุ
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <TopStatCard
            index={1}
            title="เคสทั้งหมด"
            value={String(topStats.total)}
            loading={loading}
            emphasize
            onClick={openAllCases}
          />
          <TopStatCard
            index={2}
            title="พนักงานที่เกิดเคส (คน)"
            value={String(topStats.distinctEmployees)}
            loading={loading}
            emphasize
            onClick={() => openBreakdown('employeeName')}
          />
          <TopStatCard
            index={3}
            title="ประเภทอุบัติเหตุสูงสุด"
            value={formatTopValue(topStats.accidentType)}
            loading={loading}
            tone="red"
            onClick={() => openBreakdown('accidentType')}
          />
          <TopStatCard
            index={4}
            title="ต้นเหตุหลัก"
            value={formatTopValue(topStats.rootCause)}
            loading={loading}
            tone="orange"
            onClick={() => openBreakdown('rootCause')}
          />
          <TopStatCard
            index={5}
            title="ช่วงอายุงานที่พบมากสุด"
            value={formatTopValue(topStats.yearsOfService)}
            loading={loading}
            tone="blue"
            onClick={() => openBreakdown('yearsOfService')}
          />
          <TopStatCard
            index={6}
            title="ช่วงอายุพนักงานที่พบมากสุด"
            value={formatTopValue(topStats.employeeAge, 'คน')}
            loading={loading}
            tone="blue"
            onClick={() => openBreakdown('employeeAge')}
          />
          <TopStatCard
            index={7}
            title="ช่วงเวลาที่พบมากสุด"
            value={formatTopValue(topStats.timeRange)}
            loading={loading}
            tone="blue"
            onClick={() => openBreakdown('timeRange')}
          />
          <TopStatCard
            index={8}
            title="วันที่เกิดเหตุมากสุด"
            value={formatTopValue(topStats.workDayType)}
            loading={loading}
            tone="blue"
            onClick={() => openBreakdown('workDayType')}
          />
          <TopStatCard
            index={9}
            title="จุดเกิดเหตุพบมากสุด"
            value={formatTopValue(topStats.locationDetail)}
            loading={loading}
            tone="green"
            onClick={() => openBreakdown('locationDetail')}
          />
          <TopStatCard
            index={10}
            title="รุ่นรถที่พบมากสุด"
            value={formatTopValue(topStats.vehicleModel)}
            loading={loading}
            tone="red"
            onClick={() => openBreakdown('vehicleModel')}
          />
          <TopStatCard
            index={11}
            title="ลักษณะงานที่พบมากสุด"
            value={formatTopValue(topStats.jobType)}
            loading={loading}
            tone="green"
            onClick={() => openBreakdown('jobType')}
          />
          <TopStatCard
            index={12}
            title="รายละเอียดที่พบมากสุด"
            value={formatTopValue(topStats.causeDetail)}
            loading={loading}
            tone="yellow"
            onClick={() => openBreakdown('causeDetail')}
          />
          <TopStatCard
            index={13}
            title="จำนวนเคสฝ่ายผิด"
            value={String(caseStatusCounts.atFault)}
            loading={loading}
            tone="red"
            onClick={() => openCaseStatusList(`จำนวนเคสฝ่ายผิด (${caseStatusCounts.atFault} เคส)`, 'ฝ่ายผิด')}
          />
          <TopStatCard
            index={14}
            title="จำนวนเคสฝ่ายผิด (ไม่นับเคส)"
            value={String(caseStatusCounts.atFaultUncounted)}
            loading={loading}
            tone="neutral"
            onClick={() =>
              openCaseStatusList(
                `จำนวนเคสฝ่ายผิด (ไม่นับเคส) (${caseStatusCounts.atFaultUncounted} เคส)`,
                'ฝ่ายผิดไม่นับเคส',
              )
            }
          />
          <TopStatCard
            index={15}
            title="จำนวนเคสฝ่ายถูก"
            value={String(caseStatusCounts.notAtFault)}
            loading={loading}
            tone="green"
            onClick={() => openCaseStatusList(`จำนวนเคสฝ่ายถูก (${caseStatusCounts.notAtFault} เคส)`, 'ฝ่ายถูก')}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <MonthlyTrendChart
            title="แนวโน้มเคสรายเดือน"
            subtitle="จำนวนเคสอุบัติเหตุ 6 เดือนล่าสุด"
            data={trend}
            loading={loading}
          />
          <CategoryBreakdownChart
            title="สาเหตุที่พบบ่อย"
            subtitle="ต้นเหตุของการเกิดเคส"
            buckets={rootCauseBuckets}
            loading={loading}
          />
        </div>

        <CategoryBreakdownChart
          title="ประเภทอุบัติเหตุ"
          subtitle="แยกตามลักษณะการเกิดเหตุ"
          buckets={accidentTypeBuckets}
          loading={loading}
        />

        <AccidentCaseTable onCaseUpdated={() => setRefreshKey((k) => k + 1)} />
      </div>

      <DetailListDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
        title={dialogTitle}
        items={dialogItems}
        onBack={
          drilldown?.view === 'cases' && drilldown.backField
            ? () => setDrilldown({ view: 'breakdown', field: drilldown.backField as FieldKey })
            : undefined
        }
      />
    </div>
  );
};

export default AccidentDashboardPage;
