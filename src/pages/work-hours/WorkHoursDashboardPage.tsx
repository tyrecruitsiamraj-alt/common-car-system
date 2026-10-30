import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiFetch';
import { getBadgeColor } from '@/lib/badgeColors';
import {
  WORK_HOURS_PERIODS,
  WORK_HOURS_PERIOD_LABELS,
  type WorkHoursPeriod,
  type WorkHoursSummaryResponse,
} from '@/lib/workHoursConfig';

const currency = (n: number) => `${n.toLocaleString('th-TH')} บาท`;

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4"
      style={{ borderTopColor: accent, borderTopWidth: 4 }}
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

const WorkHoursDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState<WorkHoursPeriod>('month');
  const [data, setData] = useState<WorkHoursSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<{ id: string; name: string } | null>(null);
  const [detailData, setDetailData] = useState<WorkHoursSummaryResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(`/api/work-hours-summary?period=${period}`)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setData(null);
          setError(r.status === 403 ? 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' : 'โหลดข้อมูลไม่สำเร็จ');
          return;
        }
        setData((await r.json()) as WorkHoursSummaryResponse);
      })
      .catch(() => {
        if (!cancelled) setError('โหลดข้อมูลไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    if (!detailEmployee) {
      setDetailData(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    apiFetch(`/api/work-hours-summary?period=${period}&employee_id=${detailEmployee.id}`)
      .then(async (r) => {
        if (cancelled || !r.ok) return;
        setDetailData((await r.json()) as WorkHoursSummaryResponse);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailEmployee, period]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">สรุปชั่วโมงทำงาน</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ชั่วโมงทำงานและ OT ของพนักงานขับรถ — คำนวณจากงานที่ปิดงานแล้วจริง (เวลาทำงาน 08:00–17:00 นับเป็นปกติ
              นอกเวลานับเป็น OT)
              {loading ? ' · กำลังโหลด…' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {WORK_HOURS_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    p === period ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {WORK_HOURS_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/work-hours/settings">
                <SettingsIcon className="h-3.5 w-3.5 mr-1.5" />
                ตั้งค่า OT และวันหยุด
              </Link>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="พนักงานทั้งหมด" value={`${data.summary.total_employees} คน`} accent="#2563eb" />
              <StatCard label="วิ่งงาน (เกินเกณฑ์)" value={`${data.summary.active_count} คน`} accent="#22c55e" />
              <StatCard label="ว่าง (ไม่เกินเกณฑ์)" value={`${data.summary.idle_count} คน`} accent="#94a3b8" />
              <StatCard
                label="ชั่วโมงทำงาน"
                value={`${data.summary.total_normal_hours.toLocaleString('th-TH')} ชม.`}
                accent="#8b5cf6"
              />
              <StatCard
                label="ชั่วโมง OT"
                value={`${data.summary.total_ot_hours.toLocaleString('th-TH')} ชม.`}
                accent="#ec4899"
              />
              <StatCard label="ประมาณการค่า OT" value={currency(data.summary.estimated_ot_cost)} accent="#f59e0b" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  รายละเอียดพนักงาน — {WORK_HOURS_PERIOD_LABELS[period]} ({data.from} ถึง {data.to})
                </h2>
                <span className="text-[11px] text-slate-400">
                  เกณฑ์ชั่วโมงเต็มเวลา {data.settings.full_time_threshold_hours} ชม.
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อพนักงาน</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead className="text-right">ชม.รวม</TableHead>
                      <TableHead className="text-right">ชม. OT</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">ค่า OT โดยประมาณ</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.employees.map((e) => {
                      const color = e.status === 'active' ? getBadgeColor('วิ่งงาน') : getBadgeColor('ว่าง');
                      return (
                        <TableRow key={e.employee_id}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell className="text-muted-foreground">{e.position}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.total_hours} ชม.</TableCell>
                          <TableCell className="text-right tabular-nums">{e.ot_hours} ชม.</TableCell>
                          <TableCell>
                            <Badge
                              className="border-transparent font-medium"
                              style={{ backgroundColor: color.bg, color: color.text }}
                            >
                              {e.status === 'active' ? 'วิ่งงาน' : 'ว่าง'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{currency(e.ot_cost)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailEmployee({ id: e.employee_id, name: e.name })}
                            >
                              ดูรายบุคคล
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : !loading && !error ? (
          <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>
        ) : null}
      </div>

      <Dialog open={!!detailEmployee} onOpenChange={(open) => !open && setDetailEmployee(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle>
              รายละเอียด — {detailEmployee?.name} ({WORK_HOURS_PERIOD_LABELS[period]})
            </DialogTitle>
            <DialogDescription>
              {detailLoading ? 'กำลังโหลด…' : `ทั้งหมด ${detailData?.daily?.length ?? 0} งาน`}
            </DialogDescription>
          </DialogHeader>
          {detailData?.daily && detailData.daily.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ทะเบียนรถ</TableHead>
                  <TableHead className="text-right">ชม.รวม</TableHead>
                  <TableHead className="text-right">ชม.ปกติ</TableHead>
                  <TableHead className="text-right">ชม. OT</TableHead>
                  <TableHead className="text-right">ค่า OT</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailData.daily.map((d) => (
                  <TableRow key={d.booking_id}>
                    <TableCell className="whitespace-nowrap">{d.date}</TableCell>
                    <TableCell>{d.vehicle_plate ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.total_hours}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.normal_hours}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.ot_hours}</TableCell>
                    <TableCell className="text-right tabular-nums">{currency(d.ot_cost)}</TableCell>
                    <TableCell>
                      {d.is_holiday ? (
                        <Badge className="border-transparent bg-violet-100 text-violet-700 font-medium">
                          วันหยุด
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !detailLoading ? (
            <p className="text-sm text-muted-foreground">ไม่มีงานในช่วงที่เลือก</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default WorkHoursDashboardPage;
