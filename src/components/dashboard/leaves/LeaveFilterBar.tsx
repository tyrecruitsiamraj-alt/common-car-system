import React, { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchablePicker from '@/components/shared/SearchablePicker';
import LeaveDateRangePicker from '@/components/dashboard/leaves/LeaveDateRangePicker';
import {
  EMPTY_LEAVE_FILTERS,
  LEAVE_TYPES,
  groupLeaveByEmployee,
  hasActiveLeaveFilters,
  type LeaveFilters,
  type LeaveRecord,
  type LeaveType,
} from '@/lib/leaveDashboard';

const ALL = 'all';

type Props = {
  /** รายการทั้งหมดก่อนกรอง ใช้สร้างตัวเลือกพนักงานและชื่อนาย */
  records: LeaveRecord[];
  filters: LeaveFilters;
  onChange: (next: LeaveFilters) => void;
  matchedCount: number;
};

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {children}
    </div>
  );
}

const LeaveFilterBar: React.FC<Props> = ({ records, filters, onChange, matchedCount }) => {
  const set = (patch: Partial<LeaveFilters>) => onChange({ ...filters, ...patch });
  /** SearchablePicker เก็บข้อความที่พิมพ์ไว้เอง จึงต้องสร้างใหม่ตอนล้างตัวกรอง ไม่อย่างนั้นช่องจะยังแสดงชื่อเดิม */
  const [pickerResetKey, setPickerResetKey] = useState(0);

  const employeeOptions = useMemo(
    () =>
      groupLeaveByEmployee(records).map((g) => ({
        value: g.employeeId,
        label: `${g.employeeCode} · ${g.name}`,
        keywords: g.records[0].thaiName,
      })),
    [records],
  );

  const supervisors = useMemo(
    () =>
      [...new Set(records.flatMap((r) => (r.supervisorName ? [r.supervisorName] : [])))].sort((a, b) =>
        a.localeCompare(b, 'th'),
      ),
    [records],
  );

  const toggleType = (type: LeaveType, checked: boolean) =>
    set({ types: checked ? [...filters.types, type] : filters.types.filter((t) => t !== type) });

  const typeSummary =
    filters.types.length === 0
      ? 'ทุกประเภท'
      : filters.types.length === 1
        ? filters.types[0]
        : `เลือก ${filters.types.length} ประเภท`;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <FilterField label="ช่วงวันที่">
          <LeaveDateRangePicker from={filters.from} to={filters.to} onChange={(from, to) => set({ from, to })} />
        </FilterField>

        <FilterField label="ประเภทการลา">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="h-9 w-full justify-between bg-white text-sm font-normal">
                <span className="truncate">{typeSummary}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              {LEAVE_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <Checkbox
                    checked={filters.types.includes(type)}
                    onCheckedChange={(checked) => toggleType(type, checked === true)}
                  />
                  {type}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </FilterField>

        <FilterField label="พนักงาน">
          <SearchablePicker
            key={pickerResetKey}
            value={filters.employeeId}
            onValueChange={(employeeId) => set({ employeeId })}
            options={employeeOptions}
            placeholder="ค้นหารหัสหรือชื่อ…"
            emptyMessage="ไม่พบพนักงานที่มีรายการลา"
            inputClassName="h-9 text-sm"
            aria-label="กรองตามพนักงาน"
          />
        </FilterField>

        <FilterField label="สถานะพนักงาน">
          <Select
            value={filters.status}
            onValueChange={(status) => set({ status: status as LeaveFilters['status'] })}
          >
            <SelectTrigger className="h-9 text-sm" aria-label="กรองตามสถานะพนักงาน">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ทุกสถานะ</SelectItem>
              <SelectItem value="active">ทำงานอยู่</SelectItem>
              <SelectItem value="inactive">ลาออก / พ้นสภาพ</SelectItem>
              <SelectItem value="suspended">พักงาน</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="ชื่อนาย">
          <Select
            value={filters.supervisor || ALL}
            onValueChange={(value) => set({ supervisor: value === ALL ? '' : value })}
          >
            <SelectTrigger className="h-9 text-sm" aria-label="กรองตามชื่อนาย">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ทุกคน</SelectItem>
              {supervisors.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          แสดง {matchedCount} จาก {records.length} รายการ
        </p>
        {hasActiveLeaveFilters(filters) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onChange(EMPTY_LEAVE_FILTERS);
              setPickerResetKey((k) => k + 1);
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            ล้างตัวกรอง
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default LeaveFilterBar;
