import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IssueReportForm from '@/components/complaints/IssueReportForm';
import QrCodeDialog from '@/components/complaints/QrCodeDialog';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import NotFound from '@/pages/NotFound';

const IssueReportPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [qrOpen, setQrOpen] = useState(false);
  const config = ISSUE_REPORT_TYPES.find((t) => t.slug === slug);

  if (!config) return <NotFound />;

  const Icon = config.icon;
  const publicHref = `/complaints/report/${config.slug}`;
  const publicUrl = `${window.location.origin}${publicHref}`;

  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/complaints"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Complaints
            </Link>
            <div className="mt-2 flex items-center gap-2 text-foreground">
              <Icon className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">{config.label}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={publicHref} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                เปิดลิงก์สาธารณะ
              </Link>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <QrCodeIcon className="h-3.5 w-3.5 mr-1.5" />
              แสดง QR Code
            </Button>
          </div>
        </div>

        <IssueReportForm config={config} cancelHref="/complaints" />
      </div>

      <QrCodeDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        title={config.label}
        url={publicUrl}
        filename={`complaint-qr-${config.slug}`}
      />
    </main>
  );
};

export default IssueReportPage;
