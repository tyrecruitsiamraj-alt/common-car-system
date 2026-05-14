import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { mockUsers } from '@/data/mockData';
import {
  isDemoMode,
  isConfiguredDemoMode,
  enableRuntimeDemo,
  clearRuntimeDemoFlag,
} from '@/lib/demoMode';
import { apiFetch } from '@/lib/apiFetch';
import { clearJobStaffApiCache, refreshJobStaffFromApi } from '@/lib/jobStaffRemote';
import { refreshWorkCalendarFromApi } from '@/lib/workCalendarStore';

const DEMO_STORAGE_KEY = 'jarvis_user_role';
const AUTH_TOKEN_STORAGE_KEY = 'jarvis_auth_token';

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<string | null>;
  logout: () => void | Promise<void>;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
  isAuthenticated: boolean;
  bootstrapping: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  supervisor: 2,
  staff: 1,
};

function isStoredRole(s: string | null): s is UserRole {
  return s === 'admin' || s === 'supervisor' || s === 'staff';
}

function userForDemoRole(role: UserRole): User | null {
  if (isDemoMode()) {
    return mockUsers.find((u) => u.role === role) ?? null;
  }
  const name = (import.meta.env.VITE_APP_OPERATOR_NAME as string | undefined)?.trim() || 'Operator';
  const idByRole: Record<UserRole, string> = {
    admin: 'local-admin',
    supervisor: 'local-supervisor',
    staff: 'local-staff',
  };
  return {
    id: idByRole[role],
    username: role,
    full_name: name,
    email: '',
    role,
    is_active: true,
    created_at: new Date().toISOString().slice(0, 10),
  };
}

/** อีเมลแบบ db:seed ให้ตรงกับ mock ตาม role (โหมดสาธิตจาก env) */
const DEMO_EMAIL_TO_ROLE: Record<string, UserRole> = {
  'admin@example.com': 'admin',
  'supervisor@example.com': 'supervisor',
  'staff@example.com': 'staff',
};

function mockUserForConfiguredDemo(email: string): User | null {
  const em = email.trim().toLowerCase();
  const direct = mockUsers.find((u) => u.email.toLowerCase() === em);
  if (direct) return direct;
  const role = DEMO_EMAIL_TO_ROLE[em];
  if (!role) return null;
  return mockUsers.find((u) => u.role === role) ?? null;
}

function humanizeLoginFailure(status: number, message: string | undefined, error: string | undefined): string {
  const combined = `${message ?? ''} ${error ?? ''}`.toLowerCase();
  if (combined.includes('invalid email or password')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (combined.includes('auth_jwt_secret'))
    return 'เซิร์ฟเวอร์ยังไม่ได้ตั้ง AUTH_JWT_SECRET — บน Vercel: Settings → Environment Variables แล้ว Redeploy (รายละเอียดใน .env.example)';
  if (combined.includes('service unavailable')) return 'ระบบล็อกอินไม่พร้อม (ตรวจ AUTH_JWT_SECRET และการเชื่อมต่อฐานข้อมูล)';
  if (combined.includes('account is disabled') || combined.includes('inactive')) return 'บัญชีถูกปิดการใช้งาน';
  if (message && message.trim()) return message.trim();
  if (error && error.trim()) return error.trim();

  if (status === 401) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (status === 403) return 'บัญชีถูกปิดหรือไม่มีสิทธิ์เข้าใช้';
  if (status === 404)
    return 'ไม่พบบริการล็อกอิน — เปิด API (npm run dev หรือ api:local) ให้พอร์ตตรงกับ VITE_API_PROXY_TARGET';
  if (status === 503)
    return 'ระบบไม่พร้อม — ตรวจ AUTH_JWT_SECRET และ DATABASE_URL (ท้องถิ่น: .env.local / บนเว็บ: Vercel Environment Variables)';
  if (status >= 500) return 'เซิร์ฟเวอร์ผิดพลาดชั่วคราว ลองใหม่ภายหลัง';

  if (status === 0 || Number.isNaN(status))
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจว่า API รันอยู่แล้วลองใหม่';

  return `เข้าสู่ระบบไม่สำเร็จ (HTTP ${status})`;
}

function mapApiUser(raw: Record<string, unknown>): User | null {
  const id = raw.id == null ? '' : String(raw.id).trim();
  const email = raw.email == null ? '' : String(raw.email).trim();
  const roleStr = typeof raw.role === 'string' ? raw.role.toLowerCase().trim() : '';
  const role = roleStr as UserRole;
  if (!id || !email || (role !== 'admin' && role !== 'supervisor' && role !== 'staff')) {
    return null;
  }
  return {
    id,
    username: typeof raw.username === 'string' ? raw.username : email,
    full_name: typeof raw.full_name === 'string' ? raw.full_name : email,
    email,
    role,
    is_active: raw.is_active !== false,
    created_at:
      typeof raw.created_at === 'string'
        ? raw.created_at.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (!isDemoMode()) return null;
    const saved = localStorage.getItem(DEMO_STORAGE_KEY);
    if (saved && isStoredRole(saved)) {
      return userForDemoRole(saved);
    }
    return null;
  });
  const [bootstrapping, setBootstrapping] = useState(() => !isDemoMode());

  useEffect(() => {
    if (isDemoMode()) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch('/api/auth/me');
        if (cancelled) return;
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            setUser(null);
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
            clearJobStaffApiCache();
            return;
          }
          enableRuntimeDemo();
          clearJobStaffApiCache();
          const saved = localStorage.getItem(DEMO_STORAGE_KEY);
          if (saved && isStoredRole(saved)) {
            setUser(userForDemoRole(saved) ?? null);
          } else {
            setUser(null);
          }
          return;
        }
        const data = (await r.json()) as { user?: Record<string, unknown> };
        const u = data.user ? mapApiUser(data.user) : null;
        setUser(u);
        clearRuntimeDemoFlag();
        if (u) {
          void refreshJobStaffFromApi();
          void refreshWorkCalendarFromApi();
        } else clearJobStaffApiCache();
      } catch {
        if (!cancelled) {
          enableRuntimeDemo();
          clearJobStaffApiCache();
          const saved = localStorage.getItem(DEMO_STORAGE_KEY);
          if (saved && isStoredRole(saved)) {
            setUser(userForDemoRole(saved) ?? null);
          } else {
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (isConfiguredDemoMode()) {
      if (!password.trim()) return 'กรุณากรอกรหัสผ่าน';
      const mockUser = mockUserForConfiguredDemo(email);
      if (!mockUser) {
        return `ไม่พบอีเมลในโหมดสาธิต — ลอง ${Object.keys(DEMO_EMAIL_TO_ROLE).join(', ')} หรือ ${mockUsers.map((u) => u.email).join(', ')} (รหัสผ่านใดก็ได้ที่ไม่ว่าง)`;
      }
      setUser(mockUser);
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      clearRuntimeDemoFlag();
      void refreshJobStaffFromApi();
      void refreshWorkCalendarFromApi();
      return null;
    }

    let r: Response;
    try {
      r = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
    } catch {
      return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — รัน npm run dev (รวม API) หรือ npm run api:local คู่กับ npm run dev:vite แล้วลองใหม่';
    }
    let data: Record<string, unknown> = {};
    try {
      data = (await r.json()) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    if (!r.ok) {
      const m = typeof data.message === 'string' ? data.message : undefined;
      const err = typeof data.error === 'string' ? data.error : undefined;
      const blob = [m, err, ...Object.values(data).filter((v): v is string => typeof v === 'string')]
        .join(' ')
        .toLowerCase();
      // บาง proxy / client ได้แค่ error: Service unavailable — ยังบอกทางชัดเมื่อเป็น 503
      if (
        r.status === 503 &&
        (blob.includes('auth_jwt') ||
          blob.includes('jwt_secret') ||
          (blob.includes('not configured') && blob.includes('secret')))
      ) {
        return 'เซิร์ฟเวอร์ยังไม่พร้อม (มักเป็น AUTH_JWT_SECRET หรือ DB) — บน Vercel: Project → Settings → Environment Variables → ใส่ AUTH_JWT_SECRET (สุ่ม ≥32 ตัว) + DATABASE_URL แล้ว Redeploy — ดู `.env.example`';
      }
      return humanizeLoginFailure(r.status, m, err);
    }
    if (typeof data.token === 'string' && data.token.trim()) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token.trim());
    }
    const rawUser = data.user as Record<string, unknown> | undefined;
    const u = rawUser ? mapApiUser(rawUser) : null;
    if (!u) return 'ข้อมูลผู้ใช้จากเซิร์ฟเวอร์ไม่ถูกต้อง';
    setUser(u);
    clearRuntimeDemoFlag();
    void refreshJobStaffFromApi();
    void refreshWorkCalendarFromApi();
    return null;
  }, []);

  const signUp = useCallback(
    async (payload: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
    }): Promise<string | null> => {
      const r = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: payload.email.trim(),
          password: payload.password,
          first_name: payload.first_name.trim(),
          last_name: payload.last_name.trim(),
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await r.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (!r.ok) {
        const msg =
          typeof data.message === 'string'
            ? data.message
            : typeof data.error === 'string'
              ? data.error
              : 'Register failed';
        return msg;
      }
      return null;
    },
    [],
  );

  const logout = useCallback(async () => {
    if (isDemoMode()) {
      setUser(null);
      localStorage.removeItem(DEMO_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      clearRuntimeDemoFlag();
      return;
    }
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' });
    } catch {
      /* still clear client state */
    }
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    clearJobStaffApiCache();
    clearRuntimeDemoFlag();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (requiredRole: UserRole | UserRole[]) => {
      if (!user) return false;
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const userLevel = ROLE_HIERARCHY[user.role];
      return roles.some((role) => userLevel >= ROLE_HIERARCHY[role]);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signUp,
        logout,
        hasPermission,
        isAuthenticated: !!user,
        bootstrapping,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
