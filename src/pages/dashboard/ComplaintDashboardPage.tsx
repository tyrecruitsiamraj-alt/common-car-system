import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TopStatCard from '@/components/dashboard/shared/TopStatCard';
import CategoryBreakdownChart from '@/components/dashboard/shared/CategoryBreakdownChart';
import MonthlyTrendChart from '@/components/dashboard/shared/MonthlyTrendChart';
import ComplaintCaseTable from '@/components/dashboard/complaints/ComplaintCaseTable';
import { apiFetch } from '@/lib/apiFetch';
import {
  bucketEmployeeAge,
  bucketTopCategories,
  bucketYearsOfService,
  buildMonthlyTrend,
  countDistinctValues,
  mostCommonValue,
  type TopValueSummary,
} from '@/lib/caseReportStats';
import type { Complaint } from '@/types';

function formatTopValue(top: TopValueSummary | null, unit = 'เรื่อง'): string {
  return top ? `${top.label} (${top.count} ${unit}, ${top.percent}%)` : 'ไม่มีข้อมูล';
}

const ComplaintDashboardPage: React.FC = () => {
  const [cases, setCases] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/complaints')
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setCases([]);
          return;
        }
        const data = (await r.json()) as unknown;
        setCases(Array.isArray(data) ? (data as Complaint[]) : []);
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
      distinctDrivers: countDistinctValues(cases.map((c) => c.driver_name)),
      category: mostCommonValue(cases.map((c) => c.category), total),
      complaintType: mostCommonValue(cases.map((c) => c.complaint_type), total),
      yearsOfService: bucketYearsOfService(cases.map((c) => c.years_of_service)),
      employeeAge: bucketEmployeeAge(cases.map((c) => c.employee_age)),
      rootCause: mostCommonValue(cases.map((c) => c.root_cause), total),
      employeeStatus: mostCommonValue(cases.map((c) => c.employee_status), total),
      penalty: mostCommonValue(cases.map((c) => c.penalty), total),
      correctiveAction: mostCommonValue(cases.map((c) => c.corrective_action), total),
      position: mostCommonValue(cases.map((c) => c.position), total),
      caseType: mostCommonValue(cases.map((c) => c.case_type), total),
    };
  }, [cases]);

  const categoryBuckets = useMemo(() => bucketTopCategories(cases.map((c) => c.category)), [cases]);
  const complaintTypeBuckets = useMemo(
    () => bucketTopCategories(cases.map((c) => c.complaint_type)),
    [cases],
  );
  const trend = useMemo(() => buildMonthlyTrend(cases.map((c) => c.complaint_date)), [cases]);

  return (
    <div className="-mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-6 bg-[#f8fafc] min-h-[calc(100dvh-3rem)]">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              สรุปเรื่องร้องเรียน
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              ภาพรวมเรื่องร้องเรียนที่มีการแจ้งเข้ามา — หมวดหมู่ที่พบบ่อย แนวโน้มรายเดือน และรายการเรื่องทั้งหมด
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button type="button" variant="outline" className="bg-white" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
            <Button type="button" variant="outline" className="bg-white" asChild>
              <Link to="/complaints/report" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                เปิดฟอร์มแจ้งเรื่อง
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <TopStatCard index={1} title="เรื่องทั้งหมด" value={String(topStats.total)} loading={loading} emphasize />
          <TopStatCard
            index={2}
            title="พนักงานที่ถูกร้องเรียน (คน)"
            value={String(topStats.distinctDrivers)}
            loading={loading}
            emphasize
          />
          <TopStatCard
            index={3}
            title="หมวดหมู่สูงสุด"
            value={formatTopValue(topStats.category)}
            loading={loading}
            tone="red"
          />
          <TopStatCard
            index={4}
            title="ประเภทการร้องเรียนสูงสุด"
            value={formatTopValue(topStats.complaintType)}
            loading={loading}
            tone="orange"
          />
          <TopStatCard
            index={5}
            title="ช่วงอายุงานที่พบมากสุด"
            value={formatTopValue(topStats.yearsOfService)}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={6}
            title="ช่วงอายุพนักงานที่พบมากสุด"
            value={formatTopValue(topStats.employeeAge, 'คน')}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={7}
            title="สาเหตุที่แท้จริงสูงสุด"
            value={formatTopValue(topStats.rootCause)}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={8}
            title="สถานะพนักงานที่พบมากสุด"
            value={formatTopValue(topStats.employeeStatus)}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={9}
            title="บทลงโทษที่พบมากสุด"
            value={formatTopValue(topStats.penalty)}
            loading={loading}
            tone="green"
          />
          <TopStatCard
            index={10}
            title="การดำเนินการที่พบมากสุด"
            value={formatTopValue(topStats.correctiveAction)}
            loading={loading}
            tone="red"
          />
          <TopStatCard
            index={11}
            title="ตำแหน่งที่พบมากสุด"
            value={formatTopValue(topStats.position)}
            loading={loading}
            tone="green"
          />
          <TopStatCard
            index={12}
            title="เหตุการณ์ที่พบมากสุด"
            value={formatTopValue(topStats.caseType)}
            loading={loading}
            tone="yellow"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <MonthlyTrendChart
            title="แนวโน้มเรื่องร้องเรียนรายเดือน"
            subtitle="จำนวนเรื่องร้องเรียน 6 เดือนล่าสุด"
            data={trend}
            loading={loading}
          />
          <CategoryBreakdownChart
            title="หมวดหมู่ที่พบบ่อย"
            subtitle="แยกตามหมวดหมู่การร้องเรียน"
            buckets={categoryBuckets}
            loading={loading}
          />
        </div>

        <CategoryBreakdownChart
          title="ประเภทการร้องเรียน"
          subtitle="แยกตามประเภท/ประเภทย่อยของการร้องเรียน"
          buckets={complaintTypeBuckets}
          loading={loading}
        />

        <ComplaintCaseTable onCaseUpdated={() => setRefreshKey((k) => k + 1)} />
      </div>
    </div>
  );
};

export default ComplaintDashboardPage;
