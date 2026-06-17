import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Shield, Users } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/apiFetch';
import {
  fetchFleetBookingPermissions,
  saveFleetBookingPermissions,
} from '@/lib/fleetBookingPermissions';
import type { User, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const UserPermissionsSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [editorUserId, setEditorUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingEditor, setSavingEditor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, perms] = await Promise.all([
        apiFetch('/api/app-users'),
        fetchFleetBookingPermissions(),
      ]);
      const list = usersRes.ok ? ((await usersRes.json()) as User[]) : [];
      setUsers(Array.isArray(list) ? list : []);
      setEditorUserId(perms?.completed_time_editor_user_id ?? null);
    } catch {
      setUsers([]);
      toast.error('โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateUser = async (id: string, patch: { role?: UserRole; is_active?: boolean }) => {
    setSavingUserId(id);
    try {
      const r = await apiFetch('/api/app-users', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...patch }),
      });
      const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) {
        const msg =
          typeof body.message === 'string'
            ? body.message
            : typeof body.error === 'string'
              ? body.error
              : 'บันทึกไม่สำเร็จ';
        toast.error(msg);
        return;
      }
      const updated = body as User;
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      toast.success('บันทึกบทบาทผู้ใช้แล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาดระหว่างบันทึก');
    } finally {
      setSavingUserId(null);
    }
  };

  const assignCompletedTimeEditor = async (userId: string | null) => {
    if (userId === editorUserId) return;
    setSavingEditor(true);
    try {
      const res = await saveFleetBookingPermissions(userId);
      if (!res.ok) {
        toast.error(res.message || 'มอบหมายสิทธิ์ไม่สำเร็จ');
        return;
      }
      setEditorUserId(res.data?.completed_time_editor_user_id ?? null);
      toast.success(userId ? 'มอบหมายสิทธิ์แก้เวลาหลังปิดงานแล้ว' : 'ยกเลิกสิทธิ์แก้เวลาแล้ว');
    } finally {
      setSavingEditor(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="จัดการผู้ใช้และสิทธิ์"
        subtitle="Admin กำหนดบทบาท (role) และมอบหมายสิทธิ์พิเศษให้ผู้ใช้ได้จากหน้านี้"
        backPath="/settings"
      />

      <div className="px-4 md:px-6 pb-8 max-w-4xl space-y-4">
        <div className="glass-card rounded-xl border border-border p-4 flex flex-wrap items-start gap-3 text-sm">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <p className="font-semibold text-foreground">สิทธิ์ที่มอบหมายได้</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>
                <strong className="text-foreground font-medium">บทบาท</strong> — admin / supervisor / staff
              </li>
              <li>
                <strong className="text-foreground font-medium">แก้เวลาหลังปิดงาน</strong> — ผู้ใช้คนเดียวที่แก้เวลาใบงานที่กด
                complete แล้วได้ (เริ่ม / สิ้นสุด / เวลาปิด)
              </li>
            </ul>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground px-1">กำลังโหลดรายชื่อผู้ใช้…</p>
        ) : users.length === 0 ? (
          <div className="glass-card rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีผู้ใช้ในระบบ
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary" />
              ผู้ใช้ทั้งหมด ({users.length})
            </div>

            <div className="hidden md:grid md:grid-cols-[1.4fr_1.4fr_0.9fr_0.7fr_1.1fr] gap-2 px-4 py-2 text-[11px] font-medium text-muted-foreground border-b border-border/60">
              <span>ชื่อ</span>
              <span>อีเมล</span>
              <span>บทบาท</span>
              <span className="text-center">สถานะ</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                แก้เวลาหลังปิดงาน
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {users.map((u) => {
                const busy = savingUserId === u.id;
                const isEditor = editorUserId === u.id;
                return (
                  <div
                    key={u.id}
                    className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.4fr_1.4fr_0.9fr_0.7fr_1.1fr] gap-3 md:gap-2 md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                      <p className="text-[11px] text-muted-foreground md:hidden truncate">{u.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate hidden md:block">{u.email}</p>

                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground md:hidden shrink-0">บทบาท</Label>
                      <select
                        value={u.role}
                        disabled={busy}
                        onChange={(e) => {
                          const next = e.target.value as UserRole;
                          if (next === u.role) return;
                          void updateUser(u.id, { role: next });
                        }}
                        className={cn(
                          'w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs',
                          busy && 'opacity-60',
                        )}
                      >
                        <option value="admin">admin</option>
                        <option value="supervisor">supervisor</option>
                        <option value="staff">staff</option>
                      </select>
                    </div>

                    <div className="flex md:justify-center items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground md:hidden shrink-0">สถานะ</Label>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateUser(u.id, { is_active: !u.is_active })}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full transition-colors',
                          u.is_active
                            ? 'bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          busy && 'opacity-60',
                        )}
                      >
                        {u.is_active ? 'ใช้งาน' : 'ปิดใช้'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground md:hidden shrink-0">แก้เวลา</Label>
                      <button
                        type="button"
                        disabled={savingEditor || !u.is_active}
                        onClick={() => void assignCompletedTimeEditor(isEditor ? null : u.id)}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg border transition-colors w-full md:w-auto',
                          isEditor
                            ? 'border-amber-500/50 bg-amber-500/15 text-amber-900 font-semibold'
                            : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground',
                          (savingEditor || !u.is_active) && 'opacity-60 cursor-not-allowed',
                        )}
                        title={
                          !u.is_active
                            ? 'ต้องเปิดใช้งานบัญชีก่อนมอบหมายสิทธิ์'
                            : isEditor
                              ? 'คลิกเพื่อยกเลิกสิทธิ์'
                              : 'มอบหมายให้แก้เวลาหลังปิดงาน'
                        }
                      >
                        {isEditor ? '✓ ได้รับมอบหมาย' : 'มอบหมาย'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/settings">กลับตั้งค่าธีม</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsSettingsPage;
