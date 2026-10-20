import React from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthPageShell from '@/components/auth/AuthPageShell';
import IssueReportForm from '@/components/complaints/IssueReportForm';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import NotFound from '@/pages/NotFound';

const PublicIssueReportPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const config = ISSUE_REPORT_TYPES.find((t) => t.slug === slug);

  if (!config) return <NotFound />;

  const Icon = config.icon;

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
            <Icon className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{config.label}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>

        <IssueReportForm config={config} cancelHref="/login" />
      </div>
    </AuthPageShell>
  );
};

export default PublicIssueReportPage;
