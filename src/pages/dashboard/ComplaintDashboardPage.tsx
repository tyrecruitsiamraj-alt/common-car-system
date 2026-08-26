import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  mostCommonValue,
  type TopValueSummary,
} from '@/lib/caseReportStats';
import { computeComplaintYearStats, listComplaintYears } from '@/lib/complaintDashboardStats';
import type { Complaint } from '@/types';

function formatTopValue(top: TopValueSummary | null, unit = 'เคส'): string {
  return top ? `${top.label} (${top.count} ${unit}, ${top.percent}%)` : 'ไม่มีข้อมูล';
}

const ComplaintDashboardPage: React.FC = () => {
  const [cases, setCases] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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

  const availableYears = useMemo(() => listComplaintYears(cases), [cases]);

  useEffect(() => {
    if (selectedYear !== null) return;
    if (availableYears.length > 0) setSelectedYear(availableYears[0]);
  }, [availableYears, selectedYear]);

  const yearCases = useMemo(
    () => (selectedYear ? cases.filter((c) => c.complaint_date.startsWith(String(selectedYear))) : cases),
    [cases, selectedYear],
  );

  const stats = useMemo(() => computeComplaintYearStats(yearCases), [yearCases]);
  const yearsOfService = useMemo(() => bucketYearsOfService(yearCases.map((c) => c.years_of_service)), [yearCases]);
  const employeeAge = useMemo(() => bucketEmployeeAge(yearCases.map((c) => c.employee_age)), [yearCases]);
  const topCustomer = useMemo(() => mostCommonValue(cases.map((c) => c.customer_account)), [cases]);

  const categoryBuckets = useMemo(() => bucketTopCategories(cases.map((c) => c.category)), [cases]);
  const complaintTypeBuckets = useMemo(
    () => bucketTopCategories(cases.map((c) => c.complaint_type)),
    [cases],
  );
  const trend = useMemo(() => buildMonthlyTrend(cases.map((c) => c.complaint_date)), [cases]);

  return (
    <div className="-mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-6 bg-[#f8fafc] min-h-[calc(100dvh-3rem)]">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="rounded-xl bg-slate-900 text-white px-5 py-4 space-y-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-base sm:text-lg font-semibold tracking-wide">
              COMPLAINT ANALYTICS DASHBOARD <span className="text-slate-400 mx-1">|</span> แดชบอร์ดวิเคราะห์เคสร้องเรียนพนักงานขับรถ
            </h1>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                รีเฟรช
              </Button>
              <Button type="button" variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" asChild>
                <Link to="/complaints/report" target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  เปิดฟอร์มแจ้งเรื่อง
                </Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            ลูกค้า: {topCustomer?.label ?? 'ไม่ระบุ'} <span className="mx-1">|</span> ข้อมูล ณ วันที่ {format(new Date(), 'd MMM yyyy', { locale: th })}{' '}
            <span className="mx-1">|</span> อัปเดตข้อมูลจากระบบร้องเรียนโดยตรง
          </p>
          <p className="text-xs text-slate-400 italic">
            ตัวเลขและกราฟทั้งหมดคำนวณจากเรื่องร้องเรียนในระบบ — เพิ่มเคสใหม่แล้วกด "รีเฟรช" เพื่ออัปเดตทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">ปีที่วิเคราะห์</span>
          <Select
            value={selectedYear ? String(selectedYear) : ''}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="h-8 w-24 text-sm bg-white">
              <SelectValue placeholder="ปี" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500">
            เคสในปีที่เลือก: <span className="font-semibold text-slate-800">{stats.total}</span> เคส
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <TopStatCard
            index={1}
            title={`เคสร้องเรียนทั้งหมด ปี ${selectedYear ?? ''}`}
            value={String(stats.total)}
            loading={loading}
            emphasize
          />
          <TopStatCard
            index={2}
            title="พนักงานที่ถูกร้องเรียน (คน)"
            value={String(stats.distinctDrivers)}
            loading={loading}
            emphasize
          />
          <TopStatCard
            index={3}
            title="เคสร้องเรียนซ้ำ (ครั้งที่ 2 ขึ้นไป)"
            value={`${stats.repeatComplaints.percent}% (${stats.repeatComplaints.count} เคส จากพนักงาน ${stats.repeatComplaints.distinctDrivers} คน)`}
            loading={loading}
            tone="red"
          />
          <TopStatCard
            index={4}
            title={`เคสเดือนล่าสุด (${stats.latestMonth.label})`}
            value={
              stats.latestMonth.trendPercent === null
                ? `${stats.latestMonth.count} เคส`
                : `${stats.latestMonth.count} เคส (เทียบเดือนก่อน ${stats.latestMonth.trendPercent > 0 ? '+' : ''}${stats.latestMonth.trendPercent}%)`
            }
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={5}
            title="บทลงโทษระดับรุนแรง"
            value={`${stats.severePenalty.percent}% (${stats.severePenalty.count} เคส)`}
            loading={loading}
            tone="red"
          />
          <TopStatCard
            index={6}
            title="เคสที่พนักงานพ้นสภาพ/ลาออกแล้ว"
            value={`${stats.inactiveEmployees.percent}% (${stats.inactiveEmployees.count} จากทั้งหมด ${stats.total} เคส)`}
            loading={loading}
            tone="red"
          />
          <TopStatCard
            index={7}
            title="เคสสะสม YTD"
            value={`${stats.total} (เฉลี่ย ${stats.ytdAvgPerMonth} เคส/เดือน จาก ${stats.ytdMonthsWithData} เดือน)`}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={8}
            title="ค่าเฉลี่ยเคลื่อนที่ 3 เดือน (ล่าสุด)"
            value={`${stats.movingAverage3Month} เคส/เดือน`}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={9}
            title="เดือนที่มีเคสสูงสุด"
            value={`${stats.peakMonth.label} (${stats.peakMonth.count} เคส, ${stats.peakMonth.percentOfYear}%)`}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={10}
            title="เหตุการณ์ซ้ำ (ทำผิดซ้ำเดิม)"
            value={`${stats.repeatCaseType.count} เคส (${stats.repeatCaseType.percent}% ของเคสที่มีข้อมูล)`}
            loading={loading}
            tone="yellow"
          />
          <TopStatCard
            index={11}
            title="สถานะภาพรวมล่าสุด"
            value={`${stats.statusNormal ? 'ปกติ' : 'ผิดปกติ'} (เดือน ${stats.latestMonth.label} = ${stats.latestMonth.count} เคส เทียบค่าเฉลี่ย ${stats.movingAverage3Month} เคส)`}
            loading={loading}
            tone={stats.statusNormal ? 'green' : 'red'}
          />
          <TopStatCard
            index={12}
            title="หมวดหมู่ที่พบมากสุด"
            value={formatTopValue(stats.category)}
            loading={loading}
            tone="red"
          />
          <TopStatCard
            index={13}
            title="ประเภทการร้องเรียนอันดับ 1"
            value={formatTopValue(stats.complaintType)}
            loading={loading}
            tone="orange"
          />
          <TopStatCard
            index={14}
            title="สาเหตุที่แท้จริงหลัก (Root Cause)"
            value={formatTopValue(stats.rootCause)}
            loading={loading}
            tone="blue"
          />
          <TopStatCard
            index={15}
            title="มาตรการแก้ไข/ป้องกันมากสุด"
            value={formatTopValue(stats.correctiveAction)}
            loading={loading}
            tone="green"
          />
          <TopStatCard
            index={16}
            title="ช่วงอายุงานที่พบมากสุด"
            value={formatTopValue(yearsOfService)}
            loading={loading}
            tone="green"
          />
          <TopStatCard
            index={17}
            title="ช่วงอายุพนักงานที่พบมากสุด"
            value={formatTopValue(employeeAge, 'คน')}
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
