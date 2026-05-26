import React from 'react';
import { ClipboardCheck, ExternalLink, Fuel, HeartPulse } from 'lucide-react';
import { FLEET_FORM_LINKS } from '@/lib/fleetFormsConfig';
import { Button } from '@/components/ui/button';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  start_work_sticker_single: ClipboardCheck,
  fuel_refill: Fuel,
  daily_driver_check: HeartPulse,
};

const ExamsContent: React.FC = () => (
  <div className="grid gap-4">
    {FLEET_FORM_LINKS.map((item) => {
      const Icon = ICONS[item.key] ?? ClipboardCheck;

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
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                {item.qrLabel}
                {item.stickerNote ? (
                  <span className="ml-1.5 font-normal normal-case text-muted-foreground">
                    · {item.stickerNote}
                  </span>
                ) : null}
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">หัวข้อนี้อบรม:</span>{' '}
                {item.trainingTopic}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">เมื่อไหร่ทำ:</span> {item.whenToUse}
              </p>
            </div>
          </div>

          {item.stickerImageSrc ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-white">
              <img
                src={item.stickerImageSrc}
                alt={`สติกเกอร์ QR — ${item.title}`}
                className="w-full max-h-72 object-contain object-center"
              />
            </div>
          ) : null}

          <div className="mt-4">
            <Button asChild className="rounded-2xl h-11 w-full sm:w-auto sm:min-w-[200px]">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open exam
              </a>
            </Button>
          </div>
        </article>
      );
    })}
  </div>
);

export default ExamsContent;
