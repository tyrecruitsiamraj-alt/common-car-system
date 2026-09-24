import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/apiFetch';
import { toYmdLocal } from '@/lib/dateTh';
import { ymdRangeToFetchIsoBounds } from '@/lib/exportDateRange';
import { formatThaiDate } from '@/lib/thaiDateTimeFormat';
import {
  buildExamDailyChartData,
  buildExamDailyTableRows,
  buildExamTypeTotals,
  listExamKeysInOrder,
  type ExamDailyCountRow,
} from '@/lib/examDailyStats';
import { toast } from 'sonner';

/** ลำดับ exam_key คงที่ — ใช้กำหนดสีตามลำดับ (ไม่หมุนตามอันดับจำนวน) */
const KNOWN_EXAM_ORDER = ['daily_driver_check', 'start_work_sticker_single', 'fuel_refill'];

/** สีตามลำดับหมวดหมู่คงที่ (ชุดเดียวกับ CategoryBreakdownChart) — ผ่านการตรวจ CVD/contrast แล้ว */
const EXAM_COLORS: Record<string, string> = {
  daily_driver_check: '#2a78d6',
  start_work_sticker_single: '#eb6834',
  fuel_refill: '#1baf7a',
};
const FALLBACK_COLOR = 'hsl(240 4% 65%)';

const DEFAULT_RANGE_DAYS = 14;

const ExamDailyDashboard: React.FC = () => {
  const [fromYmd, setFromYmd] = useState(() => toYmdLocal(subDays(new Date(), DEFAULT_RANGE_DAYS - 1)));
  const [toYmd, setToYmd] = useState(() => toYmdLocal(new Date()));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExamDailyCountRow[]>([]);

  const load = useCallback(async () => {
    const bounds = ymdRangeToFetchIsoBounds(fromYmd, toYmd);
    if (!bounds) {
      toast.error('ช่วงวันที่ไม่ถูกต้อง');
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ daily_counts: '1', from: bounds.fromIso, to: bounds.toIso });
      const r = await apiFetch(`/api/fleet-exam-submissions?${q}`);
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ExamDailyCountRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'โหลดสรุปรายวันไม่สำเร็จ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromYmd, toYmd]);

  useEffect(() => {
    void load();
  }, [load]);

  const examKeys = useMemo(() => listExamKeysInOrder(rows, KNOWN_EXAM_ORDER), [rows]);
  const chartData = useMemo(() => buildExamDailyChartData(rows, examKeys), [rows, examKeys]);
  const tableRows = useMemo(() => buildExamDailyTableRows(rows), [rows]);
  const typeTotals = useMemo(() => buildExamTypeTotals(rows, examKeys), [rows, examKeys]);

  const examTitleByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (!map.has(r.exam_key)) map.set(r.exam_key, r.exam_title);
    return map;
  }, [rows]);

  const chartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    for (const key of examKeys) {
      cfg[key] = {
        label: examTitleByKey.get(key) ?? key,
        color: EXAM_COLORS[key] ?? FALLBACK_COLOR,
      };
    }
    return cfg;
  }, [examKeys, examTitleByKey]);

  const isRangeValid = ymdRangeToFetchIsoBounds(fromYmd, toYmd) !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">สรุปยอดทำข้อสอบรายวัน</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            จำนวนคนที่ทำข้อสอบแต่ละประเภท แยกตามวัน (นับคนไม่ซ้ำต่อวันจากชื่อผู้ส่ง)
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">จากวันที่</Label>
            <Input
              type="date"
              value={fromYmd}
              onChange={(e) => setFromYmd(e.target.value)}
              className="h-8 text-xs w-[9.5rem]"
              max={toYmd}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">ถึงวันที่</Label>
            <Input
              type="date"
              value={toYmd}
              onChange={(e) => setToYmd(e.target.value)}
              className="h-8 text-xs w-[9.5rem]"
              min={fromYmd}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs"
            disabled={loading || !isRangeValid}
            onClick={() => void load()}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {!isRangeValid ? <p className="text-xs text-destructive">ช่วงวันที่ไม่ถูกต้อง — วันเริ่มต้องไม่เกินวันสิ้นสุด</p> : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดสรุป…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">ไม่มีการทำข้อสอบในช่วงวันที่เลือก</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {typeTotals.map((t) => (
              <div key={t.exam_key} className="rounded-xl border border-border/80 bg-white/80 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="inline-block size-2 rounded-full shrink-0"
                    style={{ backgroundColor: EXAM_COLORS[t.exam_key] ?? FALLBACK_COLOR }}
                  />
                  <p className="text-xs font-medium text-foreground truncate" title={t.exam_title}>
                    {t.exam_title}
                  </p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{t.totalSubmissions}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ครั้งที่ทำในช่วงนี้ · เฉลี่ย {t.avgPeoplePerDay} คน/วัน ({t.daysWithData} วันที่มีข้อมูล)
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/80 bg-white/80 p-4">
            <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
              <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {examKeys.map((key) => (
                  <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ChartContainer>
            <p className="text-[10px] text-muted-foreground text-center mt-1">หน่วย: จำนวนคน (ไม่ซ้ำ) ต่อวัน</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-white/80 overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">วันที่</th>
                  {examKeys.map((key) => (
                    <th key={key} className="px-3 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">
                      {examTitleByKey.get(key) ?? key}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-foreground font-semibold whitespace-nowrap">รวม (คน)</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.day} className="border-b border-border/40">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">
                      {formatThaiDate(row.day)}
                    </td>
                    {examKeys.map((key) => {
                      const cell = row.perExam[key];
                      return (
                        <td key={key} className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {cell ? cell.people : '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
                      {row.totalPeople}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            &quot;จำนวนคน&quot; นับไม่ซ้ำต่อวันจากชื่อผู้ส่งข้อสอบ — ถ้าคนเดียวส่งซ้ำหลายครั้งในวันเดียวกันจะนับเป็น 1 คน
          </p>
        </>
      )}
    </div>
  );
};

export default ExamDailyDashboard;
