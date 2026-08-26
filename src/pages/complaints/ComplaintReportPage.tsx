import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';
import AuthPageShell from '@/components/auth/AuthPageShell';
import ComplaintReportForm from '@/components/complaints/ComplaintReportForm';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';

const ComplaintReportPage: React.FC = () => {
  return (
    <AuthPageShell
      maxWidth="3xl"
      hideBrand
      footer={
        <p>
          <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
            เข้าสู่ระบบ
          </Link>
        </p>
      }
    >
      <div className="glass-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-lg shadow-black/[0.04] space-y-5">
        <div className="text-center space-y-2 pb-1">
          <Link to="/login" className="inline-flex flex-col items-center gap-2">
            <BrandMark size="md" />
            <span className="text-lg font-bold text-foreground">
              <BrandTitle />
            </span>
          </Link>
          <div className="flex items-center justify-center gap-2 text-foreground">
            <MessageSquareWarning className="h-5 w-5 text-destructive" />
            <h1 className="text-xl font-bold">แจ้งเรื่องร้องเรียน</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            กรอกรายละเอียดเรื่องร้องเรียนให้ครบถ้วนที่สุดเท่าที่ทราบ — ทีมงานจะตรวจสอบและติดตามต่อ
          </p>
        </div>

        <ComplaintReportForm />
      </div>
    </AuthPageShell>
  );
};

export default ComplaintReportPage;
