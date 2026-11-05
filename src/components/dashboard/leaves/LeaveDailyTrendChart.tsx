import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeaveTrendChart from '@/components/dashboard/leaves/LeaveTrendChart';
import {
  buildDailySeries,
  dailyZoomRange,
  defaultDailyRange,
  formatLeaveDate,
  type LeaveRecord,
} from '@/lib/leaveDashboard';

/** แกน x ของมุมมองทั้งช่วงแสดงป้ายทุก 5 วัน */
const TICK_EVERY_DAYS = 5;
/** ช่วงยาวกว่านี้จะเลื่อนแนวนอน เพื่อให้แต่ละวันยังกดได้ */
const PIXELS_PER_DAY = 14;
const SCROLL_AFTER_DAYS = 60;

type Props = {
  /** รายการที่ผ่านตัวกรองอื่นแล้ว แต่ยังไม่กรองวันที่ เพราะวันที่ซูมอาจอยู่นอกช่วงที่เลือก */
  records: LeaveRecord[];
  from?: string;
  to?: string;
  loading?: boolean;
  onOpenDay: (ymd: string) => void;
};

const LeaveDailyTrendChart: React.FC<Props> = ({ records, from, to, loading, onOpenDay }) => {
  const [zoomYmd, setZoomYmd] = useState<string | null>(null);

  useEffect(() => {
    setZoomYmd(null);
  }, [from, to]);

  const range = useMemo(() => {
    if (!from && !to) return defaultDailyRange();
    return { from: (from ?? to) as string, to: (to ?? from) as string };
  }, [from, to]);

  const overview = useMemo(() => buildDailySeries(records, range.from, range.to), [records, range]);
  const zoomed = useMemo(() => {
    if (!zoomYmd) return [];
    const window = dailyZoomRange(zoomYmd);
    return buildDailySeries(records, window.from, window.to);
  }, [records, zoomYmd]);

  if (zoomYmd) {
    return (
      <LeaveTrendChart
        key="zoom"
        title={`การลารอบวันที่ ${formatLeaveDate(zoomYmd)}`}
        subtitle="แสดงก่อนและหลัง 2 วัน กดวันเพื่อดูรายชื่อ"
        data={zoomed}
        loading={loading}
        defaultView="bar"
        onPointClick={(index) => onOpenDay(zoomed[index].ymd)}
        headerAction={
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setZoomYmd(null)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            ดูทั้งช่วง
          </Button>
        }
      />
    );
  }

  return (
    <LeaveTrendChart
      key="overview"
      title="การลารายวัน"
      subtitle={`${formatLeaveDate(range.from)} – ${formatLeaveDate(range.to)} · กดวันเพื่อดูก่อนและหลัง 2 วัน`}
      data={overview}
      loading={loading}
      defaultView="bar"
      tickEvery={TICK_EVERY_DAYS}
      hideZeroLabels
      minWidth={overview.length > SCROLL_AFTER_DAYS ? overview.length * PIXELS_PER_DAY : undefined}
      onPointClick={(index) => setZoomYmd(overview[index].ymd)}
    />
  );
};

export default LeaveDailyTrendChart;
