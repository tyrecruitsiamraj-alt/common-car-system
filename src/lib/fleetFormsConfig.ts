/**
 * ลิงก์แบบฟอร์ม/ข้อสอบจาก QR (Microsoft Forms) — metadata สอดคล้องกับ fleetExamsFromMsForms.json
 */
import syncedExams from '@/data/fleetExamsFromMsForms.json';

export type FleetFormLink = {
  key: string;
  qrLabel: string;
  title: string;
  trainingTopic: string;
  whenToUse: string;
  url: string;
  linkGroup?: string;
  stickerNote?: string;
};

export const FLEET_FORM_LINKS: FleetFormLink[] = syncedExams.map((e) => ({
  key: e.key,
  qrLabel: e.qrLabel,
  title: e.title,
  trainingTopic: e.trainingTopic,
  whenToUse: e.whenToUse,
  url: e.msFormUrl,
  stickerNote: e.stickerNote,
}));

export function countUniqueFormUrls(links: FleetFormLink[] = FLEET_FORM_LINKS): number {
  return new Set(links.map((l) => l.url)).size;
}
