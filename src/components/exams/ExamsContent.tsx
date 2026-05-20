import React, { useMemo } from 'react';
import { ClipboardCheck, ExternalLink, Fuel, QrCode, Link2 } from 'lucide-react';
import { countUniqueFormUrls, FLEET_FORM_LINKS } from '@/lib/fleetFormsConfig';
import { Button } from '@/components/ui/button';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  start_work_sticker_single: ClipboardCheck,
  start_work_sticker_pair: ClipboardCheck,
  fuel_refill: Fuel,
  custom_exam_3: ClipboardCheck,
};

const ExamsContent: React.FC = () => {
  const stickerCount = FLEET_FORM_LINKS.length;
  const uniqueUrlCount = useMemo(() => countUniqueFormUrls(), []);

  return (
    <>
      <p className="mb-3 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-slate-700">
        <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <span>
          แสดง <strong>{stickerCount} สติกเกอร์ QR</strong> ({uniqueUrlCount} ลิงก์ฟอร์มไม่ซ้ำ) — กด{' '}
          <strong>เข้าทำข้อสอบ</strong> จะเปิด Microsoft Forms (อาจต้องล็อกอินบัญชีองค์กร)
        </span>
      </p>

      {stickerCount > uniqueUrlCount ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            สติกเกอร์ <strong>สแกนเมื่อเริ่มงาน</strong> มี 2 แผ่น แต่ชี้ฟอร์มเดียวกัน — จึงมีการ์ด 2 ใบที่ลิงก์เหมือนกัน
            ถ้ามี QR แผ่นที่ 3 ที่ลิงก์ต่างจากทั้งสองแบบนี้ ส่งรูปหรือลิงก์มาเพื่อเพิ่มในระบบ
          </span>
        </p>
      ) : null}

      <div className="grid gap-4">
        {FLEET_FORM_LINKS.map((item, index) => {
          const Icon = ICONS[item.key] ?? ClipboardCheck;
          const sameUrlEarlier =
            item.linkGroup &&
            FLEET_FORM_LINKS.findIndex(
              (x) => x.linkGroup === item.linkGroup && x.url === item.url,
            ) < index;

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
                  {sameUrlEarlier ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-800 bg-amber-50 inline-block px-2 py-0.5 rounded-md border border-amber-200">
                      ลิงก์เดียวกับสติกเกอร์ «สแกนเมื่อเริ่มงาน» แผ่นอื่น
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">หัวข้อนี้อบรม:</span>{' '}
                    {item.trainingTopic}
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
};

export default ExamsContent;
