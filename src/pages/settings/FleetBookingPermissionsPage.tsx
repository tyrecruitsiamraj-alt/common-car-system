import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchFleetBookingPermissions,
  fetchFleetPermissionCandidates,
  saveFleetBookingPermissions,
  type FleetBookingPermissionEditor,
} from '@/lib/fleetBookingPermissions';
import { toast } from 'sonner';

const NONE = '__none__';

const FleetBookingPermissionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<FleetBookingPermissionEditor[]>([]);
  const [editorId, setEditorId] = useState<string>(NONE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [perms, users] = await Promise.all([
          fetchFleetBookingPermissions(),
          fetchFleetPermissionCandidates(),
        ]);
        if (cancelled) return;
        setCandidates(users);
        setEditorId(perms?.completed_time_editor_user_id ?? NONE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const nextId = editorId === NONE ? null : editorId;
      const res = await saveFleetBookingPermissions(nextId);
      if (!res.ok) {
        toast.error(res.message || 'บันทึกไม่สำเร็จ');
        return;
      }
      toast.success(nextId ? 'มอบหมายสิทธิ์แก้เวลาใบงานแล้ว' : 'ยกเลิกสิทธิ์แก้เวลาแล้ว');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="สิทธิ์แก้เวลาใบงาน"
        subtitle="กำหนดผู้ใช้คนเดียวที่แก้เวลาใบงานที่ปิดแล้วได้ (เริ่ม / สิ้นสุด / เวลาปิด)"
        backPath="/settings"
      />

      <div className="px-4 md:px-6 pb-8 max-w-xl space-y-4">
        <div className="glass-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">ผู้แก้เวลาหลังปิดงาน</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                เฉพาะคนนี้เท่านั้นที่แก้ช่วงเวลาใบงานที่กด complete แล้วได้ — ผู้อื่นแก้ไม่ได้
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">เลือกผู้ใช้ (ได้คนเดียว)</Label>
            <Select value={editorId} onValueChange={setEditorId} disabled={loading}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={loading ? 'กำลังโหลด…' : 'เลือกผู้ใช้'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— ยังไม่มอบหมาย —</SelectItem>
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name} ({u.email}) · {u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" disabled={loading || saving} onClick={() => void save()}>
              {saving ? 'กำลังบันทึก…' : 'บันทึกสิทธิ์'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/settings">กลับตั้งค่าธีม</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetBookingPermissionsPage;
