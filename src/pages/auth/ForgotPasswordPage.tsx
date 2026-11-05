import React from 'react';
import { Link } from 'react-router-dom';
import AuthPageShell from '@/components/auth/AuthPageShell';

const ForgotPasswordPage: React.FC = () => {
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
      <div className="glass-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-lg shadow-black/[0.04] space-y-3">
        <h2 className="text-lg font-semibold text-foreground">ลืมรหัสผ่าน</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอรีเซ็ตรหัสผ่าน ผู้ดูแลจะแจ้งรหัสชั่วคราวให้
          เมื่อเข้าสู่ระบบแล้วให้เปลี่ยนรหัสใหม่ที่เมนูบัญชีทันที
        </p>
      </div>
    </AuthPageShell>
  );
};

export default ForgotPasswordPage;
