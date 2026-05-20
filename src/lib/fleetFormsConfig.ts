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
};

const URL_START_WORK =
  'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ003OFpUWllVQkVCMkszN0hKMFRGSzhTNy4u';

const URL_FUEL =
  'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUMTlDR0Y0MFlWREVINzEzMFNNNFZSWVBEQi4u';

/** ชุดที่ 3 จาก env — ถ้ามี QR ลิงก์อื่นนอกจาก 2 ชุดด้านบน */
function optionalThirdFromEnv(): FleetFormLink | null {
  const url =
    typeof import.meta.env.VITE_FLEET_EXAM_3_URL === 'string'
      ? import.meta.env.VITE_FLEET_EXAM_3_URL.trim()
      : '';
  if (!url) return null;
  return {
    key: 'custom_exam_3',
    qrLabel:
      typeof import.meta.env.VITE_FLEET_EXAM_3_QR_LABEL === 'string' &&
      import.meta.env.VITE_FLEET_EXAM_3_QR_LABEL.trim()
        ? import.meta.env.VITE_FLEET_EXAM_3_QR_LABEL.trim()
        : 'สแกน QR ชุดที่ 3',
    title:
      typeof import.meta.env.VITE_FLEET_EXAM_3_TITLE === 'string' &&
      import.meta.env.VITE_FLEET_EXAM_3_TITLE.trim()
        ? import.meta.env.VITE_FLEET_EXAM_3_TITLE.trim()
        : 'ข้อสอบ / แบบฟอร์มชุดที่ 3',
    trainingTopic:
      typeof import.meta.env.VITE_FLEET_EXAM_3_TOPIC === 'string' &&
      import.meta.env.VITE_FLEET_EXAM_3_TOPIC.trim()
        ? import.meta.env.VITE_FLEET_EXAM_3_TOPIC.trim()
        : 'หัวข้อการอบรมตามฟอร์มชุดที่ 3',
    whenToUse:
      typeof import.meta.env.VITE_FLEET_EXAM_3_WHEN === 'string' &&
      import.meta.env.VITE_FLEET_EXAM_3_WHEN.trim()
        ? import.meta.env.VITE_FLEET_EXAM_3_WHEN.trim()
        : 'ตามที่กำหนดในฟอร์ม',
    url,
  };
}

/**
 * จากรูป QR ที่ส่งมา: สติกเกอร์ 3 แผ่น แต่ลิงก์ไม่ซ้ำกัน 2 ชุด
 * (สแกนเมื่อเริ่มงาน 2 แผ่น → ฟอร์มเดียวกัน)
 */
export const FLEET_FORM_LINKS: FleetFormLink[] = [
  {
    key: 'start_work_sticker_single',
    qrLabel: 'สแกนเมื่อเริ่มงาน',
    stickerNote: 'สติกเกอร์แผ่นเดี่ยว',
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
    stickerNote: 'สติกเกอร์แผ่นซ้าย (คู่กับเริ่มงาน)',
    title: 'บันทึกการเติมน้ำมัน',
    trainingTopic:
      'การบันทึกการเติมน้ำมันอย่างถูกต้อง — เลขไมล์ สถานที่เติม ปริมาณลิตร ค่าใช้จ่าย และใบเสร็จ เพื่อควบคุมต้นทุนและตรวจสอบย้อนหลัง',
    whenToUse: 'ทุกครั้งหลังเติมน้ำมันเสร็จ',
    url: URL_FUEL,
  },
  {
    key: 'start_work_sticker_pair',
    qrLabel: 'สแกนเมื่อเริ่มงาน',
    stickerNote: 'สติกเกอร์แผ่นขวา (คู่กับเติมน้ำมัน)',
    title: 'บันทึกการตรวจสภาพรถ (ประจำตำแหน่ง)',
    trainingTopic:
      'การตรวจสภาพรถก่อนออกปฏิบัติงาน — ความปลอดภัย อุปกรณ์ ไฟ ยาง เบรก เอกสารรถ และการบันทึกเลขไมล์ก่อนใช้งาน',
    whenToUse: 'ทุกครั้งก่อนเริ่มงาน / ก่อนออกรถ',
    url: URL_START_WORK,
    linkGroup: 'start_work',
  },
  ...(optionalThirdFromEnv() ? [optionalThirdFromEnv()!] : []),
];

export function countUniqueFormUrls(links: FleetFormLink[] = FLEET_FORM_LINKS): number {
  return new Set(links.map((l) => l.url)).size;
}
