import React from 'react';
import { ClipboardCheck, ExternalLink, Fuel, QrCode } from 'lucide-react';
import { FLEET_FORM_LINKS } from '@/lib/fleetFormsConfig';
import { Button } from '@/components/ui/button';

const ICONS = {
  start_work_inspection: ClipboardCheck,
  fuel_refill: Fuel,
} as const;

const ExamsContent: React.FC = () => (
  <>
    <p className="mb-4 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-slate-700">
      <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      <span>
        แต่ละการ์ดคือฟอร์มจากสติกเกอร์ QR — กด <strong>เข้าทำข้อสอบ</strong> จะเปิด Microsoft Forms
        (อาจต้องล็อกอินบัญชีองค์กร)
      </span>
    </p>

    <div className="grid gap-4">
      {FLEET_FORM_LINKS.map((item) => {
        const Icon = ICONS[item.key as keyof typeof ICONS] ?? ClipboardCheck;
        return (
          <article
            key={item.key}
            className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.qrLabel}</p>
                <h2 className="mt-0.5 text-lg font-bold text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">หัวข้อนี้อบรม:</span> {item.trainingTopic}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">เมื่อไหร่ทำ:</span> {item.whenToUse}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild className="rounded-2xl h-11 flex-1 sm:flex-none sm:min-w-[200px]">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  เข้าทำข้อสอบ
                </a>
              </Button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-[11px] text-muted-foreground hover:text-primary sm:flex-1"
                title={item.url}
              >
                {item.url}
              </a>
            </div>
          </article>
        );
      })}
    </div>
  </>
);

export default ExamsContent;
