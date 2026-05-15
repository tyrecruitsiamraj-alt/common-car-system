import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** เฉพาะ admin — ใช้กับหน้าตั้งค่าระบบ / branding */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { hasPermission, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  if (!hasPermission('admin')) {
    return <Navigate to="/fleet" replace />;
  }

  return <>{children}</>;
}
