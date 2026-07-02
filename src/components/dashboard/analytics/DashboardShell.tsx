import React from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DashboardFilterBar from '@/components/dashboard/analytics/DashboardFilterBar';
import DashboardKpiCard from '@/components/dashboard/analytics/DashboardKpiCard';
import DashboardChartSection from '@/components/dashboard/analytics/DashboardChartSection';
import DashboardDriverOverview from '@/components/dashboard/analytics/DashboardDriverOverview';
import DashboardWorkQueueTable from '@/components/dashboard/analytics/DashboardWorkQueueTable';
import type { DashboardData, DashboardFilters } from '@/lib/dashboard/types';
import type { Employee, Vehicle } from '@/types';

type Props = {
  data: DashboardData;
  filters: DashboardFilters;
  onFiltersChange: (patch: Partial<DashboardFilters>) => void;
  employees: Employee[];
  vehicles: Vehicle[];
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
};

const DashboardShell: React.FC<Props> = ({
  data,
  filters,
  onFiltersChange,
  employees,
  vehicles,
  loading,
  onRefresh,
  onExport,
}) => {
  return (
    <div className="-mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-6 bg-[#f8fafc] min-h-[calc(100dvh-3rem)]">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              ติดตามสถานะงาน Fleet แบบ real-time — ดู KPI, แนวโน้ม และ Work Queue ที่ต้องทำก่อน
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                placeholder="ค้นหาใบงาน, คน, ปลายทาง…"
                className="pl-9 bg-white border-slate-200"
              />
            </div>
            <Button type="button" variant="outline" className="bg-white" onClick={onRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
            <Button type="button" className="bg-slate-900 hover:bg-slate-800 text-white" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside className="w-full lg:w-72 shrink-0">
            <DashboardFilterBar
              filters={filters}
              onChange={onFiltersChange}
              employees={employees}
              vehicles={vehicles}
              periodLabel={data.periodLabel}
            />
          </aside>

          <div className="flex-1 min-w-0 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {data.kpis.map((kpi) => (
                <DashboardKpiCard key={kpi.id} kpi={kpi} loading={loading} />
              ))}
            </div>

            <DashboardChartSection
              trendSeries={data.trendSeries}
              statusSlices={data.statusSlices}
              loading={loading}
            />

            <DashboardDriverOverview drivers={data.driverSlices} loading={loading} />

            <DashboardWorkQueueTable items={data.workQueue} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardShell;
