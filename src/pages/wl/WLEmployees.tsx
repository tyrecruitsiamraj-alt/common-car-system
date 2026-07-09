import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import AppPage from '@/components/layout/AppPage';
import QuickAddDriverForm from '@/components/wl/QuickAddDriverForm';
import DriverEditDialog from '@/components/wl/DriverEditDialog';
import ExportExcelButton from '@/components/shared/ExportExcelButton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { exportDriversExcel } from '@/lib/fleetExcelExport';
import { deleteEmployee } from '@/lib/createEmployeeSimple';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Employee, EmployeeStatus } from '@/types';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { mockEmployees } from '@/data/mockData';
import { DEMO_CANDIDATES_CHANGED_EVENT, getCandidates, getEmployees } from '@/lib/demoStorage';
import { mergeCandidateSources } from '@/lib/mergeCandidates';
import { candidateToWlEmployeeRow, isWlStaffingTrack, WL_FROM_CANDIDATE_PREFIX } from '@/lib/wlFromCandidate';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
import { readJsonSafe } from '@/lib/api';
import { isDemoMode } from '@/lib/demoMode';
import { apiFetch } from '@/lib/apiFetch';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const statusFilters: { value: EmployeeStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ไม่ใช้งาน' },
  { value: 'suspended', label: 'ระงับ' },
];

/** รายชื่อสำหรับ "โหมดสาธิต" เท่านั้น — รวม mock + local storage + ผู้สมัคร track WL (ข้อมูลจากยุคระบบสรรหาเดิม) */
function demoEmployeeSource(): Employee[] {
  const cand = mergeCandidateSources([], getCandidates());
  const map = new Map<string, Employee>();
  [...mockEmployees, ...getEmployees()].forEach((item) => map.set(item.id, item));
  const base = [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const wlRows = cand.filter(isWlStaffingTrack).map(candidateToWlEmployeeRow);
  return [...base, ...wlRows];
}

function matchesSearch(e: Employee, search: string): boolean {
  if (!search) return true;
  return `${e.first_name} ${e.last_name} ${e.phone} ${e.employee_code} ${e.position}`
    .toLowerCase()
    .includes(search.toLowerCase());
}

function isManageableDriver(emp: Employee): boolean {
  return !emp.id.startsWith(WL_FROM_CANDIDATE_PREFIX);
}

function buildEmployeesQuery(filter: EmployeeStatus | 'all', search: string, limit: number, offset: number): string {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (filter !== 'all') params.set('status', filter);
  if (search) params.set('search', search);
  return `/api/employees?${params.toString()}`;
}

const WLEmployees: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('staff');
  const [filter, setFilter] = useState<EmployeeStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [demoVersion, setDemoVersion] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // debounce การพิมพ์ค้นหา ก่อนยิง query จริง (ลดจำนวน request ต่อ keystroke)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // เปลี่ยนตัวกรอง/คำค้นหา → กลับไปหน้าแรกเสมอ
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    if (!isDemoMode()) return;
    const onCand = () => setDemoVersion((v) => v + 1);
    window.addEventListener(DEMO_CANDIDATES_CHANGED_EVENT, onCand);
    return () => window.removeEventListener(DEMO_CANDIDATES_CHANGED_EVENT, onCand);
  }, []);

  // โหมดสาธิต: ไม่มี backend จริง — กรอง/แบ่งหน้าฝั่ง client จากข้อมูลตัวอย่างทั้งหมด
  useEffect(() => {
    if (!isDemoMode()) return;
    const all = demoEmployeeSource()
      .filter((e) => filter === 'all' || e.status === filter)
      .filter((e) => matchesSearch(e, search));
    setTotal(all.length);
    setEmployees(all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    setLoading(false);
    setError(null);
  }, [filter, search, page, demoVersion, reloadToken]);

  // โหมดจริง: กรอง/แบ่งหน้าฝั่ง server ทั้งหมด (status, search, limit/offset) — อ่านจำนวนรวมจาก header X-Total-Count
  useEffect(() => {
    if (isDemoMode()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(buildEmployeesQuery(filter, search, PAGE_SIZE, (page - 1) * PAGE_SIZE))
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setEmployees([]);
          setTotal(0);
          return;
        }
        const data = await readJsonSafe<Employee[]>(r);
        const list = Array.isArray(data) ? data : [];
        setEmployees(list);
        const totalHeader = r.headers.get('X-Total-Count');
        const parsed = totalHeader ? parseInt(totalHeader, 10) : NaN;
        setTotal(Number.isFinite(parsed) ? parsed : list.length);
      })
      .catch(() => {
        if (!cancelled) {
          setEmployees([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, search, page, reloadToken]);

  // ลบแถวสุดท้ายของหน้าสุดท้ายแล้วหน้าว่าง → ถอยกลับหนึ่งหน้าอัตโนมัติ
  useEffect(() => {
    if (!loading && employees.length === 0 && page > 1 && total > 0) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [loading, employees.length, page, total]);

  const reloadEmployees = useCallback(async () => {
    setReloadToken((t) => t + 1);
  }, []);

  const handleExportDriversExcel = useCallback(async () => {
    let rows: Employee[];
    if (isDemoMode()) {
      rows = demoEmployeeSource()
        .filter((e) => filter === 'all' || e.status === filter)
        .filter((e) => matchesSearch(e, search));
    } else {
      try {
        const r = await apiFetch(buildEmployeesQuery(filter, search, 500, 0));
        const data = r.ok ? await readJsonSafe<Employee[]>(r) : [];
        rows = Array.isArray(data) ? data : [];
      } catch {
        rows = [];
      }
    }
    if (rows.length === 0) {
      toast.message('ไม่มีข้อมูลให้ส่งออก');
      return;
    }
    try {
      exportDriversExcel(rows);
      toast.success(`ส่งออก Excel แล้ว (${rows.length} คน)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ส่งออก Excel ไม่สำเร็จ');
    }
  }, [filter, search]);

  const openEditDriver = (emp: Employee) => {
    setEditEmployee(emp);
    setEditDialogOpen(true);
  };

  const handleDeleteDriver = async (emp: Employee) => {
    if (!canEdit || !isManageableDriver(emp)) return;
    const name = formatEmployeeDisplayName(emp);
    if (
      !window.confirm(
        `ลบรายชื่อ ${name} ?\n\nการจองที่เกี่ยวข้องจะถูกลบด้วย — ไม่สามารถกู้คืนได้`,
      )
    ) {
      return;
    }
    setDeletingId(emp.id);
    try {
      await deleteEmployee(emp.id);
      toast.success(`ลบ ${name} แล้ว`);
      if (editEmployee?.id === emp.id) {
        setEditDialogOpen(false);
        setEditEmployee(null);
      }
      await reloadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  const renderDriverActions = (emp: Employee) => {
    if (!canEdit || !isManageableDriver(emp)) return null;
    const busy = deletingId === emp.id;
    return (
      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label={`แก้ไข ${formatEmployeeDisplayName(emp)}`}
          disabled={busy}
          onClick={() => openEditDriver(emp)}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`ลบ ${formatEmployeeDisplayName(emp)}`}
          disabled={busy}
          onClick={() => void handleDeleteDriver(emp)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const paginationControls =
    totalPages > 1 ? (
      <Pagination className="justify-between sm:justify-center">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) setPage((p) => p - 1);
              }}
              className={cn(page <= 1 && 'pointer-events-none opacity-40')}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-3 text-sm text-muted-foreground whitespace-nowrap">
              หน้า {page} / {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages) setPage((p) => p + 1);
              }}
              className={cn(page >= totalPages && 'pointer-events-none opacity-40')}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    ) : null;

  return (
    <AppPage maxWidth="4xl" panel>
      <PageHeader
        showBrandKicker
        title="Drivers"
        subtitle={`${total} คน — เพิ่มชื่อได้จากฟอร์มด้านล่าง`}
        backPath="/fleet"
        className="mb-6"
        actions={
          <ExportExcelButton
            onClick={() => void handleExportDriversExcel()}
            disabled={loading || total === 0}
          />
        }
      />

      <div className="space-y-4">
        <QuickAddDriverForm id="driver-quick-add" onCreated={() => void reloadEmployees()} />

        {loading && <div className="text-sm text-muted-foreground">กำลังโหลดพนักงาน...</div>}
        {error && <div className="text-sm text-destructive">เกิดข้อผิดพลาด: {error}</div>}

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาพนักงาน..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  filter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && employees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            ยังไม่มีรายชื่อ — กรอกฟอร์มด้านบนแล้วกดบันทึกรายชื่อ
          </p>
        ) : null}

        {isMobile ? (
          <div className="space-y-2">
            {employees.map((emp) => {
              const actions = renderDriverActions(emp);
              return (
              <div
                key={emp.id}
                className="glass-card rounded-xl p-4 border border-border hover:border-primary/40 transition-all"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/fleet/drivers/${emp.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {formatEmployeeDisplayName(emp)}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full shrink-0',
                        emp.status === 'active'
                          ? 'bg-success/15 text-success'
                          : emp.status === 'suspended'
                            ? 'bg-destructive/15 text-destructive'
                            : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {emp.status === 'active'
                        ? 'ใช้งาน'
                        : emp.status === 'suspended'
                          ? 'ระงับ'
                          : 'ไม่ใช้งาน'}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {emp.employee_code} • {emp.phone}
                  </div>
                </button>
                {actions ? (
                  <div className="mt-2 pt-2 border-t border-border/50 flex justify-end">{actions}</div>
                ) : null}
              </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">รหัส</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">ตำแหน่ง</th>
                  <th className="px-4 py-3 text-center text-muted-foreground font-medium">สถานะ</th>
                  {canEdit ? (
                    <th className="px-4 py-3 text-center text-muted-foreground font-medium w-24">จัดการ</th>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/fleet/drivers/${emp.id}`)}
                    className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employee_code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatEmployeeDisplayName(emp)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{emp.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.position}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          emp.status === 'active'
                            ? 'bg-success/15 text-success'
                            : emp.status === 'suspended'
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {emp.status === 'active'
                          ? 'ใช้งาน'
                          : emp.status === 'suspended'
                            ? 'ระงับ'
                            : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3 text-center">{renderDriverActions(emp)}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paginationControls}
      </div>

      <DriverEditDialog
        employee={editEmployee}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditEmployee(null);
        }}
        onUpdated={() => void reloadEmployees()}
      />
    </AppPage>
  );
};

export default WLEmployees;
