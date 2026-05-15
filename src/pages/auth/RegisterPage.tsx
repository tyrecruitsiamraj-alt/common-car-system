import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/ui/password-field';
import { Label } from '@/components/ui/label';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { toast } from 'sonner';

function humanizeRegisterError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('already registered') || s.includes('duplicate') || s.includes('unique')) {
    return 'อีเมลนี้ลงทะเบียนแล้ว';
  }
  if (s.includes('at least 8')) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (s.includes('first_name') && s.includes('last_name')) return 'กรุณากรอกชื่อและนามสกุล';
  if (raw.trim()) return raw.trim();
  return 'สมัครสมาชิกไม่สำเร็จ';
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }
    setSubmitting(true);
    try {
      const msg = await signUp({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      if (msg) {
        setError(humanizeRegisterError(msg));
        return;
      }
      toast.success('สมัครสมาชิกเรียบร้อย — เข้าสู่ระบบได้เลย');
      navigate('/login', { replace: true });
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      footer={
        <>
          <p>
            มีบัญชีแล้ว?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
              เข้าสู่ระบบ
            </Link>
          </p>
          <p>
            <Link to="/forgot-password" className="text-primary hover:underline underline-offset-4">
              ลืมรหัสผ่าน
            </Link>
          </p>
        </>
      }
    >
      <div className="glass-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-lg shadow-black/[0.04] space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">สมัครสมาชิก</h2>
          <p className="text-xs text-muted-foreground mt-1">
            สร้างบัญชีใหม่ (สิทธิ์เริ่มต้น: staff) — เพิ่ม/ลบข้อมูลได้ แก้ไขรายการต้อง supervisor ขึ้นไป หน้าตั้งค่าระบบเฉพาะ admin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reg-first">ชื่อ</Label>
              <Input
                id="reg-first"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-last">นามสกุล</Label>
              <Input
                id="reg-last"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">อีเมล</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">รหัสผ่าน</Label>
            <PasswordField
              id="reg-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="min-h-[44px]"
            />
            <p className="text-[10px] text-muted-foreground">อย่างน้อย 8 ตัวอักษร</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm">ยืนยันรหัสผ่าน</Label>
            <PasswordField
              id="reg-confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] p-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 touch-manipulation"
          >
            {submitting ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}
          </button>
        </form>

        {error ? (
          <p
            className="text-xs text-destructive text-left whitespace-pre-wrap break-words"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    </AuthPageShell>
  );
};

export default RegisterPage;
