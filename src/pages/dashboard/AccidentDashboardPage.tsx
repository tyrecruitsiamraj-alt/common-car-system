import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AccidentKpiCard from '@/components/dashboard/accidents/AccidentKpiCard';
import AccidentBreakdownChart from '@/components/dashboard/accidents/AccidentBreakdownChart';
import AccidentTrendChart from '@/components/dashboard/accidents/AccidentTrendChart';
import AccidentCaseTable from '@/components/dashboard/accidents/AccidentCaseTable';
import { apiFetch } from '@/lib/apiFetch';
import { bucketTopCategories, buildMonthlyTrend, isSameMonthAsNow } from '@/lib/accidentCasesReport';
import type { AccidentCase } from '@/types';

/** ค่า "สถานะเคส" ที่นับเป็นฝ่ายผิด/ฝ่ายถูก — ข้อความอิสระจากฟอร์ม จับคู่แบบ includes ให้ครอบคลุมคำที่ใกล้เคียง */
function isAtFault(caseStatus?: string): boolean {
  return (caseStatus ?? '').includes('ผิด');
}
function isNotAtFault(caseStatus?: string): boolean {
  return (caseStatus ?? '').includes('ถูก');
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

  const kpis = useMemo(() => {
    const total = cases.length;
    const thisMonth = cases.filter((c) => isSameMonthAsNow(c.case_date)).length;
    const atFault = cases.filter((c) => isAtFault(c.case_status)).length;
    const notAtFault = cases.filter((c) => isNotAtFault(c.case_status)).length;
    return { total, thisMonth, atFault, notAtFault };
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
          <AccidentKpiCard label="เคสทั้งหมด" value={String(kpis.total)} hint="ทุกเคสที่มีการแจ้ง" loading={loading} />
          <AccidentKpiCard label="เคสเดือนนี้" value={String(kpis.thisMonth)} hint="นับตามวันที่เกิดเคส" loading={loading} />
          <AccidentKpiCard
            label="ฝ่ายผิด"
            value={String(kpis.atFault)}
            hint="จากสถานะเคสที่ระบุ"
            loading={loading}
            tone="danger"
          />
          <AccidentKpiCard label="ฝ่ายถูก" value={String(kpis.notAtFault)} hint="จากสถานะเคสที่ระบุ" loading={loading} />
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
