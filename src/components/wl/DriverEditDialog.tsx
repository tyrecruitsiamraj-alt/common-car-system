import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateEmployee } from '@/lib/createEmployeeSimple';
import {
  cancelPendingEmployeeChange,
  fetchEmployeeStatusHistory,
  scheduleEmployeeChange,
} from '@/lib/employeeStatusChanges';
import { formatEmployeeDisplayName, TITLE_PREFIX_OPTIONS } from '@/lib/titlePrefixOptions';
import { DRIVER_DIRECTORY_POSITIONS } from '@/lib/driverListPositions';
import { toYmdLocal } from '@/lib/dateTh';
import type { Employee, EmployeeChangeType, EmployeeStatusHistory } from '@/types';
import { toast } from 'sonner';

const TITLE_PREFIX_NONE = '__none__';

const CHANGE_TYPE_LABEL: Record<EmployeeChangeType, string> = {
  resignation: 'ลาออก / พ้นสภาพ',
  temp_replacement: 'เปลี่ยนตัว',
  position_change: 'เปลี่ยนตำแหน่ง / เปลี่ยนนาย',
};

type Props = {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (employee: Employee) => void;
};

export default function DriverEditDialog({ employee, open, onOpenChange, onUpdated }: Props) {
  const [titlePrefix, setTitlePrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [changeType, setChangeType] = useState<EmployeeChangeType | null>(null);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newBossName, setNewBossName] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [changeSaving, setChangeSaving] = useState(false);
  const [cancelingChange, setCancelingChange] = useState(false);

  const [history, setHistory] = useState<EmployeeStatusHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!employee) return;
    setTitlePrefix(employee.title_prefix ?? '');
    setFirstName(employee.first_name);
    setLastName(employee.last_name);
    setPhone(employee.phone);
    setChangeType(null);
    setEffectiveDate(toYmdLocal(new Date()));
    setNewPosition('');
    setNewBossName('');
    setChangeNote('');
    setShowHistory(false);
    setHistory([]);
  }, [employee]);

  const loadHistory = async () => {
    if (!employee) return;
    setLoadingHistory(true);
    try {
      setHistory(await fetchEmployeeStatusHistory(employee.id));
    } catch {
      toast.error('โหลดประวัติไม่สำเร็จ');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) void loadHistory();
  };

  const handleScheduleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !changeType || changeSaving) return;
    if (!effectiveDate) {
      toast.error('กรุณาระบุวันที่มีผล');
      return;
    }
    if (changeType === 'position_change' && !newPosition.trim() && !newBossName.trim()) {
      toast.error('กรุณาระบุตำแหน่งใหม่ หรือ ชื่อนายใหม่ อย่างน้อยหนึ่งอย่าง');
      return;
    }
    setChangeSaving(true);
    try {
      const updated = await scheduleEmployeeChange({
        employee_id: employee.id,
        change_type: changeType,
        effective_date: effectiveDate,
        new_position: newPosition.trim() || undefined,
        new_boss_name: newBossName.trim() || undefined,
        note: changeNote.trim() || undefined,
      });
      toast.success(`บันทึกการ${CHANGE_TYPE_LABEL[changeType]}แล้ว มีผลวันที่ ${effectiveDate}`);
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setChangeSaving(false);
    }
  };

  const handleCancelPendingChange = async () => {
    if (!employee || cancelingChange) return;
    setCancelingChange(true);
    try {
      const updated = await cancelPendingEmployeeChange(employee.id);
      toast.success('ยกเลิกการเปลี่ยนแปลงที่รอดำเนินการแล้ว');
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ยกเลิกไม่สำเร็จ');
    } finally {
      setCancelingChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || saving) return;
    setSaving(true);
    try {
      const updated = await updateEmployee(employee.id, {
        title_prefix: titlePrefix,
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      toast.success('บันทึกชื่อแล้ว');
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'แก้ไขไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[1.25rem]">
        <DialogHeader>
          <DialogTitle>แก้ไขชื่อผู้ขับ</DialogTitle>
          <DialogDescription>
            {employee ? formatEmployeeDisplayName(employee) : '—'} · {employee?.employee_code}
          </DialogDescription>
        </DialogHeader>
        {employee ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-driver-prefix" className="text-xs">
                  คำนำหน้า
                </Label>
                <Select
                  value={titlePrefix || TITLE_PREFIX_NONE}
                  onValueChange={(v) => setTitlePrefix(v === TITLE_PREFIX_NONE ? '' : v)}
                >
                  <SelectTrigger id="edit-driver-prefix" className="min-h-[40px]">
                    <SelectValue placeholder="เลือก" />
                  </SelectTrigger>
                  <SelectContent>
                    {TITLE_PREFIX_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || TITLE_PREFIX_NONE} value={opt.value || TITLE_PREFIX_NONE}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-driver-first" className="text-xs">
                  ชื่อ *
                </Label>
                <Input
                  id="edit-driver-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-driver-last" className="text-xs">
                  นามสกุล *
                </Label>
                <Input
                  id="edit-driver-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-driver-phone" className="text-xs">
                เบอร์โทร *
              </Label>
              <Input
                id="edit-driver-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </Button>
            </div>
          </form>
        ) : null}

        {employee ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="text-xs text-muted-foreground">
              ตำแหน่งปัจจุบัน: <span className="font-medium text-foreground">{employee.position}</span>
              {employee.assigned_boss_name ? (
                <>
                  {' '}
                  · นายปัจจุบัน:{' '}
                  <span className="font-medium text-foreground">{employee.assigned_boss_name}</span>
                </>
              ) : null}
            </div>

            {employee.pending_change_type ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
                <div className="font-medium text-foreground">
                  มีการ{CHANGE_TYPE_LABEL[employee.pending_change_type]}รอมีผลวันที่{' '}
                  {employee.pending_effective_date}
                </div>
                <div className="text-muted-foreground space-y-0.5">
                  {employee.pending_status ? <div>สถานะใหม่: {employee.pending_status}</div> : null}
                  {employee.pending_position ? <div>ตำแหน่งใหม่: {employee.pending_position}</div> : null}
                  {employee.pending_boss_name ? <div>นายใหม่: {employee.pending_boss_name}</div> : null}
                  {employee.pending_note ? <div>หมายเหตุ: {employee.pending_note}</div> : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCancelPendingChange()}
                  disabled={cancelingChange}
                >
                  {cancelingChange ? 'กำลังยกเลิก…' : 'ยกเลิกการเปลี่ยนแปลงนี้'}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CHANGE_TYPE_LABEL) as EmployeeChangeType[]).map((ct) => (
                    <Button
                      key={ct}
                      type="button"
                      size="sm"
                      variant={changeType === ct ? 'default' : 'outline'}
                      onClick={() => setChangeType(changeType === ct ? null : ct)}
                    >
                      {CHANGE_TYPE_LABEL[ct]}
                    </Button>
                  ))}
                </div>

                {changeType ? (
                  <form
                    onSubmit={(e) => void handleScheduleChange(e)}
                    className="space-y-3 rounded-lg border border-border p-3"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="change-effective-date" className="text-xs">
                        วันที่มีผล *
                      </Label>
                      <Input
                        id="change-effective-date"
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        required
                      />
                    </div>

                    {changeType === 'position_change' ? (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="change-new-position" className="text-xs">
                            ตำแหน่งใหม่ (ถ้ามีการเปลี่ยน)
                          </Label>
                          <Select
                            value={newPosition || '__none__'}
                            onValueChange={(v) => setNewPosition(v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger id="change-new-position" className="min-h-[40px]">
                              <SelectValue placeholder="ไม่เปลี่ยนตำแหน่ง" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">ไม่เปลี่ยนตำแหน่ง</SelectItem>
                              {DRIVER_DIRECTORY_POSITIONS.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="change-new-boss" className="text-xs">
                            ชื่อนายใหม่ (ถ้ามีการเปลี่ยนนาย)
                          </Label>
                          <Input
                            id="change-new-boss"
                            value={newBossName}
                            onChange={(e) => setNewBossName(e.target.value)}
                            placeholder="เช่น นายสมชาย ใจดี"
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="space-y-1.5">
                      <Label htmlFor="change-note" className="text-xs">
                        หมายเหตุ
                      </Label>
                      <Textarea
                        id="change-note"
                        value={changeNote}
                        onChange={(e) => setChangeNote(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setChangeType(null)} disabled={changeSaving}>
                        ยกเลิก
                      </Button>
                      <Button type="submit" disabled={changeSaving}>
                        {changeSaving ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </>
            )}

            <div>
              <Button type="button" size="sm" variant="ghost" onClick={handleToggleHistory} className="text-xs px-0">
                {showHistory ? 'ซ่อนประวัติการเปลี่ยนแปลง' : 'ดูประวัติการเปลี่ยนแปลง'}
              </Button>
              {showHistory ? (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {loadingHistory ? (
                    <div className="text-xs text-muted-foreground">กำลังโหลด…</div>
                  ) : history.length === 0 ? (
                    <div className="text-xs text-muted-foreground">ยังไม่มีประวัติ</div>
                  ) : (
                    history.map((h) => (
                      <div key={h.id} className="rounded-md border border-border p-2 text-xs space-y-0.5">
                        <div className="font-medium text-foreground">
                          {CHANGE_TYPE_LABEL[h.change_type]} · มีผล {h.effective_date}
                        </div>
                        {h.old_status !== h.new_status ? (
                          <div className="text-muted-foreground">
                            สถานะ: {h.old_status} → {h.new_status}
                          </div>
                        ) : null}
                        {h.old_position !== h.new_position ? (
                          <div className="text-muted-foreground">
                            ตำแหน่ง: {h.old_position} → {h.new_position}
                          </div>
                        ) : null}
                        {h.old_boss_name !== h.new_boss_name ? (
                          <div className="text-muted-foreground">
                            นาย: {h.old_boss_name || '—'} → {h.new_boss_name || '—'}
                          </div>
                        ) : null}
                        {h.note ? <div className="text-muted-foreground">หมายเหตุ: {h.note}</div> : null}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
