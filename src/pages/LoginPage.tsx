import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/ui/password-field';
import { Label } from '@/components/ui/label';
import AuthPageShell from '@/components/auth/AuthPageShell';

/** ตรงกับผลลัพธ์ default ของ npm run db:seed (ถ้าตั้ง SEED_USER_PASSWORD ให้ใช้รหัสนั้นแทน) */
const TRIAL_EMAIL =
  typeof import.meta.env.VITE_LOGIN_TRIAL_EMAIL === 'string' && import.meta.env.VITE_LOGIN_TRIAL_EMAIL.trim()
    ? import.meta.env.VITE_LOGIN_TRIAL_EMAIL.trim()
    : 'admin@example.com';
const TRIAL_PASSWORD_HINT =
  typeof import.meta.env.VITE_LOGIN_TRIAL_PASSWORD_HINT === 'string' && import.meta.env.VITE_LOGIN_TRIAL_PASSWORD_HINT.trim()
    ? import.meta.env.VITE_LOGIN_TRIAL_PASSWORD_HINT.trim()
    : 'ChangeMe123!';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const forgotHref = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : '/forgot-password';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const msg = await signIn(email, password);
      if (msg) setError(msg);
      else {
        const from = (location.state as { from?: { pathname: string } })?.from;
        const path = from?.pathname && from.pathname !== '/login' ? from.pathname : '/';
        navigate(path, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      footer={
        <p>
          ยังไม่มีบัญชี?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline underline-offset-4">
            สมัครสมาชิก
          </Link>
        </p>
      }
    >
      <div className="glass-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-lg shadow-black/[0.04] space-y-4">
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 space-y-1">
          <p className="text-xs font-medium text-foreground">บัญชีทดลอง (หลังรัน db:seed)</p>
          <p className="text-xs text-muted-foreground">
            Email: <span className="font-mono text-foreground">{TRIAL_EMAIL}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Password: <span className="font-mono text-foreground">{TRIAL_PASSWORD_HINT}</span>{' '}
            <span className="italic">หรือรหัสที่ตั้งใน SEED_USER_PASSWORD</span>
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={TRIAL_EMAIL}
              required
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Link
                to={forgotHref}
                className="text-xs font-medium text-primary hover:underline underline-offset-4 touch-manipulation py-1"
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <PasswordField
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="min-h-[44px]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] p-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 touch-manipulation"
          >
            {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {error ? (
          <p className="text-xs text-destructive text-center" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </AuthPageShell>
  );
};

export default LoginPage;
