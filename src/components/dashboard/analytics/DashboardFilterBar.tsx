import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DateSelectDmyBe from '@/components/shared/DateSelectDmyBe';
import { STATUS_LABELS } from '@/lib/dashboard/buildDashboardData';
import type { DashboardFilters, DashboardTaskStatus } from '@/lib/dashboard/types';
import type { DashboardPeriodPreset } from '@/lib/fleetDashboardStats';
import type { Employee, Vehicle } from '@/types';

const PERIOD_LABELS: Record<DashboardPeriodPreset, string> = {
  this_week: 'สัปดาห์นี้',
  this_month: 'เดือนนี้',
  last_week: 'สัปดาห์ที่แล้ว',
  last_month: 'เดือนที่แล้ว',
  custom: 'กำหนดเอง',
};

const STATUS_OPTIONS: Array<{ value: DashboardFilters['status']; label: string }> = [
  { value: 'all', label: 'ทุกสถานะ' },
  ...(['pending', 'in_progress', 'overdue', 'at_risk', 'completed', 'cancelled'] as DashboardTaskStatus[]).map(
    (s) => ({ value: s, label: STATUS_LABELS[s] }),
  ),
];

type Props = {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
  employees: Employee[];
  vehicles: Vehicle[];
  periodLabel: string;
};

const DashboardFilterBar: React.FC<Props> = ({
  filters,
  onChange,
  employees,
  vehicles,
  periodLabel,
}) => {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4 lg:sticky lg:top-20">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        <p className="text-xs text-slate-500 mt-0.5">{periodLabel}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">ช่วงเวลา</Label>
        <Select
          value={filters.periodPreset}
          onValueChange={(v) => onChange({ periodPreset: v as DashboardPeriodPreset })}
        >
          <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as DashboardPeriodPreset[]).map((key) => (
              <SelectItem key={key} value={key}>
                {PERIOD_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.periodPreset === 'custom' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">ตั้งแต่</Label>
            <DateSelectDmyBe
              value={filters.customFromYmd}
              onChange={(ymd) => onChange({ customFromYmd: ymd })}
              yearKind="ce"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">ถึง</Label>
            <DateSelectDmyBe
              value={filters.customToYmd}
              onChange={(ymd) => onChange({ customToYmd: ymd })}
              yearKind="ce"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">สถานะ</Label>
        <Select value={filters.status} onValueChange={(v) => onChange({ status: v as DashboardFilters['status'] })}>
          <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">ผู้รับผิดชอบ</Label>
        <Select value={filters.ownerId || '__all__'} onValueChange={(v) => onChange({ ownerId: v === '__all__' ? '' : v })}>
          <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
            <SelectValue placeholder="ทุกคน" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">ทุกคน</SelectItem>
            {employees
              .filter((e) => e.status === 'active')
              .map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">รถ</Label>
        <Select
          value={filters.vehicleId || '__all__'}
          onValueChange={(v) => onChange({ vehicleId: v === '__all__' ? '' : v })}
        >
          <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
            <SelectValue placeholder="ทุกคัน" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">ทุกคัน</SelectItem>
            {vehicles
              .filter((v) => v.is_active !== false)
              .map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate_no} {v.label ? `· ${v.label}` : ''}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default DashboardFilterBar;
