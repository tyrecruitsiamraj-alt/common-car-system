import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Shield, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiFetch } from '@/lib/apiFetch';
import {
  fetchFleetBookingPermissions,
  saveFleetBookingPermissions,
} from '@/lib/fleetBookingPermissions';
import {
  DELETE_COMPLAINTS_CAPABILITY,
  fetchCapabilityStatus,
  setUserCapabilityGrant,
} from '@/lib/userPermissions';
import type { User, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const UserPermissionsSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [editorUserId, setEditorUserId] = useState<string | null>(null);
  const [deleteComplaintsUserIds, setDeleteComplaintsUserIds] = useState<Set<string>>(new Set());
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingEditor, setSavingEditor] = useState(false);
  const [savingDeleteUserId, setSavingDeleteUserId] = useState<string | null>(null);
  const [confirmDisableUser, setConfirmDisableUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, perms, deletePerm] = await Promise.all([
        apiFetch('/api/app-users'),
        fetchFleetBookingPermissions(),
        fetchCapabilityStatus(DELETE_COMPLAINTS_CAPABILITY),
      ]);
      const list = usersRes.ok ? ((await usersRes.json()) as User[]) : [];
      setUsers(Array.isArray(list) ? list : []);
      setEditorUserId(perms?.completed_time_editor_user_id ?? null);
      setDeleteComplaintsUserIds(new Set(deletePerm?.grantedUserIds ?? []));
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
      if (patch.is_active === false) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast.success('ลบผู้ใช้งานออกจากระบบแล้ว');
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

  const toggleDeleteComplaints = async (userId: string, nextGranted: boolean) => {
    setSavingDeleteUserId(userId);
    try {
      const res = await setUserCapabilityGrant(userId, DELETE_COMPLAINTS_CAPABILITY, nextGranted);
      if (!res.ok) {
        toast.error(res.message || 'บันทึกสิทธิ์ไม่สำเร็จ');
        return;
      }
      setDeleteComplaintsUserIds((prev) => {
        const next = new Set(prev);
        if (nextGranted) next.add(userId);
        else next.delete(userId);
        return next;
      });
      toast.success(nextGranted ? 'ให้สิทธิ์ลบข้อมูลแบบฟอร์มแล้ว' : 'ยกเลิกสิทธิ์ลบข้อมูลแบบฟอร์มแล้ว');
    } finally {
      setSavingDeleteUserId(null);
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
              <li>
                <strong className="text-foreground font-medium">แก้ไข/ลบข้อมูลแบบฟอร์ม</strong> (รถเข้าศูนย์/นายบิน/การลา/ความเร็ว)
                — staff แก้ไขได้ทุกคน, supervisor ขึ้นไปแก้ไข/ลบได้เสมอ, staff ที่ต้องการสิทธิ์ลบเพิ่มเติมมอบหมายได้ที่นี่
                (admin ลบได้เสมอโดยไม่ต้องมอบหมาย)
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

            <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_0.8fr_0.6fr_1fr_1fr] gap-2 px-4 py-2 text-[11px] font-medium text-muted-foreground border-b border-border/60">
              <span>ชื่อ</span>
              <span>อีเมล</span>
              <span>บทบาท</span>
              <span className="text-center">สถานะ</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                แก้เวลาหลังปิดงาน
              </span>
              <span className="flex items-center gap-1">
                <Trash2 className="h-3 w-3" />
                ลบข้อมูลแบบฟอร์ม
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {users.map((u) => {
                const busy = savingUserId === u.id;
                const isEditor = editorUserId === u.id;
                const canDeleteComplaints = deleteComplaintsUserIds.has(u.id);
                const savingDelete = savingDeleteUserId === u.id;
                /** admin และ supervisor ลบได้เสมอตามบทบาท ไม่ต้องมอบหมายเพิ่ม — toggle นี้มีไว้ให้ staff เท่านั้น */
                const hasDeleteByRole = u.role === 'admin' || u.role === 'supervisor';
                return (
                  <div
                    key={u.id}
                    className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.2fr_1.2fr_0.8fr_0.6fr_1fr_1fr] gap-3 md:gap-2 md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                      <p className="text-[11px] text-muted-foreground md:hidden truncate">
                        {u.is_active ? u.email : '—'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate hidden md:block">
                      {u.is_active ? u.email : '—'}
                    </p>

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
                        onClick={() => setConfirmDisableUser(u)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full transition-colors',
                          u.is_active
                            ? 'bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25'
                            : 'bg-red-500/15 text-red-800 hover:bg-red-500/25',
                          busy && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        {u.is_active ? 'ใช้งาน' : 'ลบออกจากระบบ'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground md:hidden shrink-0">แก้เวลา</Label>
                      <button
                        type="button"
                        disabled={savingEditor || !u.is_active || u.role !== 'supervisor'}
                        onClick={() => void assignCompletedTimeEditor(isEditor ? null : u.id)}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg border transition-colors w-full md:w-auto',
                          isEditor || u.role === 'admin'
                            ? 'border-amber-500/50 bg-amber-500/15 text-amber-900 font-semibold'
                            : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground',
                          (savingEditor || !u.is_active || u.role !== 'supervisor') && 'opacity-60 cursor-not-allowed',
                        )}
                        title={
                          u.role === 'admin'
                            ? 'admin แก้เวลาได้เสมอโดยไม่ต้องมอบหมาย'
                            : u.role !== 'supervisor'
                              ? 'มอบหมายได้เฉพาะตำแหน่ง Supervisor เท่านั้น'
                              : !u.is_active
                                ? 'ต้องเปิดใช้งานบัญชีก่อนมอบหมายสิทธิ์'
                                : isEditor
                                  ? 'คลิกเพื่อยกเลิกสิทธิ์'
                                  : 'มอบหมายให้แก้เวลาหลังปิดงาน'
                        }
                      >
                        {u.role === 'admin' ? '✓ admin' : isEditor ? '✓ ได้รับมอบหมาย' : 'มอบหมาย'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground md:hidden shrink-0">ลบแบบฟอร์ม</Label>
                      <button
                        type="button"
                        disabled={savingDelete || !u.is_active || hasDeleteByRole}
                        onClick={() => void toggleDeleteComplaints(u.id, !canDeleteComplaints)}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg border transition-colors w-full md:w-auto',
                          canDeleteComplaints || hasDeleteByRole
                            ? 'border-red-500/50 bg-red-500/15 text-red-900 font-semibold'
                            : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground',
                          (savingDelete || !u.is_active || hasDeleteByRole) && 'opacity-60 cursor-not-allowed',
                        )}
                        title={
                          hasDeleteByRole
                            ? `${u.role} ลบได้เสมอตามบทบาทโดยไม่ต้องมอบหมาย`
                            : !u.is_active
                              ? 'ต้องเปิดใช้งานบัญชีก่อนมอบหมายสิทธิ์'
                              : canDeleteComplaints
                                ? 'คลิกเพื่อยกเลิกสิทธิ์'
                                : 'มอบสิทธิ์ลบข้อมูลแบบฟอร์ม'
                        }
                      >
                        {hasDeleteByRole ? `✓ ${u.role}` : canDeleteComplaints ? '✓ ลบได้' : 'มอบสิทธิ์'}
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

      <AlertDialog
        open={confirmDisableUser !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDisableUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบผู้ใช้งานนี้ออกจากระบบถาวร?</AlertDialogTitle>
            <AlertDialogDescription>
              แถวของ “{confirmDisableUser?.full_name}” จะถูกลบออกจากระบบทั้งหมดทันที (ไม่ใช่แค่ปิดสถานะ)
              และไม่สามารถกู้คืนได้ หากต้องการกลับมาใช้งานอีกครั้งต้องสมัครสมาชิกใหม่เท่านั้น
              (บัญชีที่สมัครใหม่จะได้ตำแหน่ง Staff เสมอ ปรับตำแหน่งได้เฉพาะ admin)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = confirmDisableUser;
                setConfirmDisableUser(null);
                if (target) void updateUser(target.id, { is_active: false });
              }}
            >
              ยืนยันลบผู้ใช้งาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserPermissionsSettingsPage;
