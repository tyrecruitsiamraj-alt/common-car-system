import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type QrCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
  filename: string;
};

const QrCodeDialog: React.FC<QrCodeDialogProps> = ({ open, onOpenChange, title, url, filename }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCodeIcon className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>สแกนเพื่อเปิดฟอร์มสาธารณะ</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR Code — ${title}`} className="h-64 w-64 rounded-lg border border-slate-200" />
          ) : (
            <div className="h-64 w-64 animate-pulse rounded-lg bg-slate-100" />
          )}

          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!dataUrl}
            asChild={Boolean(dataUrl)}
          >
            {dataUrl ? (
              <a href={dataUrl} download={`${filename}.png`}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                ดาวน์โหลด QR Code (PNG)
              </a>
            ) : (
              <span>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                ดาวน์โหลด QR Code (PNG)
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QrCodeDialog;
