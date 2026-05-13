import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { apiFetch } from '@/lib/apiFetch';

const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email')?.trim() ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const e = searchParams.get('email')?.trim() ?? '';
    if (e) setEmail(e);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const em = email.trim();
    if (!em) {
      setMsg('กรุณากรอกอีเมล');
      return;
    }
    setBusy(true);
    try {
      const r = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: em }),
      });
      const data = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
      const text =
        typeof data.message === 'string'
          ? data.message
          : typeof data.error === 'string'
            ? data.error
            : r.ok
              ? 'ดำเนินการแล้ว'
              : 'ไม่สามารถดำเนินการได้';
      setMsg(text);
      setOk(r.ok);
    } catch {
      setMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      setOk(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell
      footer={
        <p>
          <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
            กลับไปเข้าสู่ระบบ
          </Link>
          {' · '}
          <Link to="/register" className="text-primary hover:underline underline-offset-4">
            สมัครสมาชิก
          </Link>
        </p>
      }
    >
      <div className="glass-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-lg shadow-black/[0.04] space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">ลืมรหัสผ่าน</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            กรอกอีเมลที่ลงทะเบียนไว้ ระบบจะรีเซ็ตรหัสและแสดงรหัสชั่วคราวใหม่ในข้อความตอบกลับ (เก็บรหัสไว้ใช้ล็อกอิน แล้วไปเปลี่ยนรหัสถาวรที่เมนูบัญชี)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fp-email">อีเมล</Label>
            <Input
              id="fp-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="min-h-[44px]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[48px] p-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 touch-manipulation"
          >
            {busy ? 'กำลังส่ง…' : 'รีเซ็ตรหัสผ่าน'}
          </button>
        </form>

        {msg ? (
          <p
            className={`text-sm leading-relaxed whitespace-pre-wrap ${ok ? 'text-foreground' : 'text-destructive'}`}
            role="status"
          >
            {msg}
          </p>
        ) : null}
      </div>
    </AuthPageShell>
  );
};

export default ForgotPasswordPage;
