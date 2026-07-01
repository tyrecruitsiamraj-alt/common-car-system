import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/ui/password-field';
import { Label } from '@/components/ui/label';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { loginErrorSuggestHealthLink } from '@/lib/loginSetupHint';

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
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <Link
          to="/exams"
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted touch-manipulation"
        >
          <ClipboardList className="h-5 w-5 shrink-0" />
          ข้อสอบระบบ
        </Link>

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
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
            className="w-full min-h-[44px] p-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 touch-manipulation"
          >
            {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {error ? (
          <div className="space-y-2" role="alert">
            <p className="text-xs text-destructive text-left whitespace-pre-wrap break-words">{error}</p>
            {loginErrorSuggestHealthLink(error) ? (
              <p className="text-xs text-muted-foreground text-left">
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
                >
                  เปิดหน้าตรวจสถานะ API (/api/health)
                </a>
                {' — '}
                ใช้โดเมนเดียวกับหน้านี้ (ไม่ต้องพิมพ์โดเมนใหม่)
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </AuthPageShell>
  );
};

export default LoginPage;
