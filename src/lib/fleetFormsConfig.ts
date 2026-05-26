/**
 * ลิงก์แบบฟอร์ม/ข้อสอบจาก QR (Microsoft Forms)
 * แก้ข้อความหัวข้อการอบรมได้ที่ไฟล์นี้
 */
export type FleetFormLink = {
  key: string;
  /** ข้อความบนสติกเกอร์ QR */
  qrLabel: string;
  title: string;
  /** หัวข้อนี้อบรมอะไร / เน้นเรื่องอะไร */
  trainingTopic: string;
  /** เมื่อไหร่ต้องทำ */
  whenToUse: string;
  url: string;
  /** ถ้าหลายสติกเกอร์ชี้ฟอร์มเดียวกัน — ใส่ key เดียวกันเพื่อแสดงป้ายใน UI */
  linkGroup?: string;
  /** หมายเหตุว่าสติกเกอร์อยู่ที่ไหน (จากรูป QR ที่สแกน) */
  stickerNote?: string;
  /** รูปสติกเกอร์ QR (ใน public/) */
  stickerImageSrc?: string;
};

const URL_START_WORK =
  'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ003OFpUWllVQkVCMkszN0hKMFRGSzhTNy4u';

const URL_FUEL =
  'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUMTlDR0Y0MFlWREVINzEzMFNNNFZSWVBEQi4u';

const URL_DAILY_DRIVER_CHECK = 'https://forms.office.com/r/eM11rBeKc3';

function dailyDriverCheckUrl(): string {
  const fromEnv =
    typeof import.meta.env.VITE_FLEET_EXAM_3_URL === 'string'
      ? import.meta.env.VITE_FLEET_EXAM_3_URL.trim()
      : '';
  return fromEnv || URL_DAILY_DRIVER_CHECK;
}

/**
 * สติกเกอร์ 3 ชุด — ลิงก์คนละฟอร์ม
 */
export const FLEET_FORM_LINKS: FleetFormLink[] = [
  {
    key: 'start_work_sticker_single',
    qrLabel: 'สแกนเมื่อเริ่มงาน',
    stickerNote: 'สติกเกอร์ชุดที่ 1',
    title: 'บันทึกการตรวจสภาพรถ (ประจำตำแหน่ง)',
    trainingTopic:
      'การตรวจสภาพรถก่อนออกปฏิบัติงาน — ความปลอดภัย อุปกรณ์ ไฟ ยาง เบรก เอกสารรถ และการบันทึกเลขไมล์ก่อนใช้งาน',
    whenToUse: 'ทุกครั้งก่อนเริ่มงาน / ก่อนออกรถ',
    url: URL_START_WORK,
    linkGroup: 'start_work',
  },
  {
    key: 'fuel_refill',
    qrLabel: 'สแกนเมื่อเติมน้ำมัน',
    stickerNote: 'สติกเกอร์ชุดที่ 2',
    title: 'บันทึกการเติมน้ำมัน',
    trainingTopic:
      'การบันทึกการเติมน้ำมันอย่างถูกต้อง — เลขไมล์ สถานที่เติม ปริมาณลิตร ค่าใช้จ่าย และใบเสร็จ เพื่อควบคุมต้นทุนและตรวจสอบย้อนหลัง',
    whenToUse: 'ทุกครั้งหลังเติมน้ำมันเสร็จ',
    url: URL_FUEL,
  },
  {
    key: 'daily_driver_check',
    qrLabel: 'Daily Driver Check Sheet',
    stickerNote: 'สติกเกอร์ชุดที่ 3',
    stickerImageSrc: '/exams/daily-driver-check-sheet.png',
    title: 'Daily Driver Check Sheet',
    trainingTopic:
      'รักษาสุขภาพร่างกายแข็งแรง เพื่อตนเองและครอบครัว พร้อมบริการให้ดีที่สุดในวันนี้ — ตรวจสุขภาพและความพร้อมก่อนปฏิบัติหน้าที่ขับรถ',
    whenToUse: 'ทุกวันก่อนเริ่มงาน / ก่อนออกรถ',
    url: dailyDriverCheckUrl(),
  },
];

export function countUniqueFormUrls(links: FleetFormLink[] = FLEET_FORM_LINKS): number {
  return new Set(links.map((l) => l.url)).size;
}
