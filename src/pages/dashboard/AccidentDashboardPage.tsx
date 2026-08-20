import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AccidentTopStatCard from '@/components/dashboard/accidents/AccidentTopStatCard';
import AccidentBreakdownChart from '@/components/dashboard/accidents/AccidentBreakdownChart';
import AccidentTrendChart from '@/components/dashboard/accidents/AccidentTrendChart';
import AccidentCaseTable from '@/components/dashboard/accidents/AccidentCaseTable';
import { apiFetch } from '@/lib/apiFetch';
import {
  bucketEmployeeAge,
  bucketTopCategories,
  bucketYearsOfService,
  buildMonthlyTrend,
  countDistinctEmployees,
  mostCommonValue,
  type TopValueSummary,
} from '@/lib/accidentCasesReport';
import type { AccidentCase } from '@/types';

function formatTopValue(top: TopValueSummary | null, unit = 'เคส'): string {
  return top ? `${top.label} (${top.count} ${unit}, ${top.percent}%)` : 'ไม่มีข้อมูล';
}

const AccidentDashboardPage: React.FC = () => {
  const [cases, setCases] = useState<AccidentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
      distinctEmployees: countDistinctEmployees(cases),
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

  const accidentTypeBuckets = useMemo(
    () => bucketTopCategories(cases.map((c) => c.accident_type)),
    [cases],
  );
  const rootCauseBuckets = useMemo(
    () => bucketTopCategories(cases.map((c) => c.root_cause)),
    [cases],
  );
  const trend = useMemo(() => buildMonthlyTrend(cases), [cases]);

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
          <AccidentTopStatCard index={1} title="เคสทั้งหมด" value={String(topStats.total)} loading={loading} emphasize />
          <AccidentTopStatCard
            index={2}
            title="พนักงานที่เกิดเคส (คน)"
            value={String(topStats.distinctEmployees)}
            loading={loading}
            emphasize
          />
          <AccidentTopStatCard
            index={3}
            title="ประเภทอุบัติเหตุสูงสุด"
            value={formatTopValue(topStats.accidentType)}
            loading={loading}
            tone="red"
          />
          <AccidentTopStatCard
            index={4}
            title="ต้นเหตุหลัก"
            value={formatTopValue(topStats.rootCause)}
            loading={loading}
            tone="orange"
          />
          <AccidentTopStatCard
            index={5}
            title="ช่วงอายุงานที่พบมากสุด"
            value={formatTopValue(topStats.yearsOfService)}
            loading={loading}
            tone="blue"
          />
          <AccidentTopStatCard
            index={6}
            title="ช่วงอายุพนักงานที่พบมากสุด"
            value={formatTopValue(topStats.employeeAge, 'คน')}
            loading={loading}
            tone="blue"
          />
          <AccidentTopStatCard
            index={7}
            title="ช่วงเวลาที่พบมากสุด"
            value={formatTopValue(topStats.timeRange)}
            loading={loading}
            tone="blue"
          />
          <AccidentTopStatCard
            index={8}
            title="วันที่เกิดเหตุมากสุด"
            value={formatTopValue(topStats.workDayType)}
            loading={loading}
            tone="blue"
          />
          <AccidentTopStatCard
            index={9}
            title="จุดเกิดเหตุพบมากสุด"
            value={formatTopValue(topStats.locationDetail)}
            loading={loading}
            tone="green"
          />
          <AccidentTopStatCard
            index={10}
            title="รุ่นรถที่พบมากสุด"
            value={formatTopValue(topStats.vehicleModel)}
            loading={loading}
            tone="red"
          />
          <AccidentTopStatCard
            index={11}
            title="ลักษณะงานที่พบมากสุด"
            value={formatTopValue(topStats.jobType)}
            loading={loading}
            tone="green"
          />
          <AccidentTopStatCard
            index={12}
            title="รายละเอียดที่พบมากสุด"
            value={formatTopValue(topStats.causeDetail)}
            loading={loading}
            tone="yellow"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AccidentTrendChart data={trend} loading={loading} />
          <AccidentBreakdownChart
            title="สาเหตุที่พบบ่อย"
            subtitle="ต้นเหตุของการเกิดเคส"
            buckets={rootCauseBuckets}
            loading={loading}
          />
        </div>

        <AccidentBreakdownChart
          title="ประเภทอุบัติเหตุ"
          subtitle="แยกตามลักษณะการเกิดเหตุ"
          buckets={accidentTypeBuckets}
          loading={loading}
        />

        <AccidentCaseTable onCaseUpdated={() => setRefreshKey((k) => k + 1)} />
      </div>
    </div>
  );
};

export default AccidentDashboardPage;
