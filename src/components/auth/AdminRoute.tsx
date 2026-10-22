import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

/** เฉพาะ admin (หรือ minRole ที่ระบุ) — ใช้กับหน้าตั้งค่าระบบ / branding */
export default function AdminRoute({
  children,
  minRole = 'admin',
}: {
  children: React.ReactNode;
  minRole?: UserRole;
}) {
  const { hasPermission, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  if (!hasPermission(minRole)) {
    return <Navigate to="/fleet" replace />;
  }

  return <>{children}</>;
}
