import React from 'react';
import DateSelectDmyBe from '@/components/shared/DateSelectDmyBe';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DashboardPeriodPreset } from '@/lib/fleetDashboardStats';

const PRESET_LABELS: Record<DashboardPeriodPreset, string> = {
  this_week: 'สัปดาห์นี้',
  this_month: 'เดือนนี้',
  last_week: 'สัปดาห์ที่แล้ว',
  last_month: 'เดือนที่แล้ว',
  custom: 'กำหนดเอง',
};

type Props = {
  preset: DashboardPeriodPreset;
  onPresetChange: (preset: DashboardPeriodPreset) => void;
  customFromYmd: string;
  customToYmd: string;
  onCustomFromChange: (ymd: string) => void;
  onCustomToChange: (ymd: string) => void;
  periodLabel: string;
};

const DashboardPeriodPicker: React.FC<Props> = ({
  preset,
  onPresetChange,
  customFromYmd,
  customToYmd,
  onCustomFromChange,
  onCustomToChange,
  periodLabel,
}) => {
  return (
    <div className="glass-card rounded-3xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        <div className="space-y-1.5 min-w-[10rem]">
          <Label className="text-xs text-muted-foreground">ช่วงเวลา</Label>
          <Select value={preset} onValueChange={(v) => onPresetChange(v as DashboardPeriodPreset)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRESET_LABELS) as DashboardPeriodPreset[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PRESET_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {preset === 'custom' ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ตั้งแต่</Label>
              <DateSelectDmyBe value={customFromYmd} onChange={onCustomFromChange} yearKind="ce" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ถึง</Label>
              <DateSelectDmyBe value={customToYmd} onChange={onCustomToChange} yearKind="ce" />
            </div>
          </>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{periodLabel}</p>
    </div>
  );
};

export default DashboardPeriodPicker;
