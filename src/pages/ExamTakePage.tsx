import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import AuthPageShell from '@/components/auth/AuthPageShell';
import ExamForm from '@/components/exams/ExamForm';
import { getFleetExam } from '@/lib/fleetExamsConfig';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';

const ExamTakePage: React.FC = () => {
  const { examKey } = useParams<{ examKey: string }>();
  const { isAuthenticated } = useAuth();
  const exam = examKey ? getFleetExam(examKey) : undefined;

  if (!exam) {
    return <Navigate to="/exams" replace />;
  }

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
        <div className="space-y-2 pb-1">
          <Link to="/login" className="inline-flex items-center gap-2">
            <BrandMark size="sm" />
            <span className="text-base font-bold text-foreground">
              <BrandTitle />
            </span>
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {exam.qrLabel}
            {exam.stickerNote ? (
              <span className="ml-1.5 font-normal normal-case text-muted-foreground">· {exam.stickerNote}</span>
            ) : null}
          </p>
          <div className="flex items-center gap-2 text-foreground">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-xl font-bold">{exam.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">ทำข้อสอบในระบบ — ไม่ต้องเปิดลิงก์ภายนอก</p>
        </div>

        <ExamForm exam={exam} />
      </div>
    </AuthPageShell>
  );
};

export default ExamTakePage;
