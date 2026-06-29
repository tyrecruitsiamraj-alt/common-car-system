import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import AuthPageShell from '@/components/auth/AuthPageShell';
import ExamScoresContent from '@/components/exams/ExamScoresContent';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';

const ExamResultsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthPageShell
      maxWidth="3xl"
      hideBrand
      footer={
        <p>
          <Link to="/exams" className="font-medium text-primary hover:underline underline-offset-4">
            กลับรายการข้อสอบ
          </Link>
          {isAuthenticated ? (
            <>
              {' · '}
              <Link to="/fleet" className="font-medium text-primary hover:underline underline-offset-4">
                หน้าหลักระบบ
              </Link>
            </>
          ) : (
            <>
              {' · '}
              <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
                เข้าสู่ระบบ
              </Link>
            </>
          )}
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
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">ผลการทำข้อสอบ</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            ค้นหาด้วยชื่อผู้ขับ ทะเบียนรถ หรือรหัสการส่ง — ดูคำตอบทั้งหมดได้
          </p>
        </div>

        <ExamScoresContent expandFirst />
      </div>
    </AuthPageShell>
  );
};

export default ExamResultsPage;
