/**
 * ข้อสอบ / แบบบันทึกในระบบ (แทน Microsoft Forms)
 */
export type ExamQuestion =
  | {
      id: string;
      type: 'text';
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      type: 'textarea';
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      type: 'yes_no';
      label: string;
      required?: boolean;
    }
  | {
      id: string;
      type: 'single';
      label: string;
      options: string[];
      required?: boolean;
    };

export type FleetExam = {
  key: string;
  qrLabel: string;
  title: string;
  trainingTopic: string;
  whenToUse: string;
  stickerNote?: string;
  questions: ExamQuestion[];
};

export const FLEET_EXAMS: FleetExam[] = [
  {
    key: 'start_work_sticker_single',
    qrLabel: 'สแกนเมื่อเริ่มงาน',
    stickerNote: 'สติกเกอร์ชุดที่ 1',
    title: 'บันทึกการตรวจสภาพรถ (ประจำตำแหน่ง)',
    trainingTopic:
      'การตรวจสภาพรถก่อนออกปฏิบัติงาน — ความปลอดภัย อุปกรณ์ ไฟ ยาง เบรก เอกสารรถ และการบันทึกเลขไมล์ก่อนใช้งาน',
    whenToUse: 'ทุกครั้งก่อนเริ่มงาน / ก่อนออกรถ',
    questions: [
      { id: 'driver_name', type: 'text', label: 'ชื่อผู้ขับ', required: true },
      { id: 'plate', type: 'text', label: 'ทะเบียนรถ', required: true },
      { id: 'odometer', type: 'text', label: 'เลขไมล์ก่อนออกรถ', required: true },
      { id: 'lights_ok', type: 'yes_no', label: 'ไฟหน้า-ไฟท้าย ไฟเลี้ยว ไฟเบรก ใช้งานได้ครบ', required: true },
      { id: 'brakes_ok', type: 'yes_no', label: 'เบรกและเบรกมือทำงานปกติ', required: true },
      { id: 'tires_ok', type: 'yes_no', label: 'ยางและแรงลมอยู่ในสภาพใช้งานได้', required: true },
      { id: 'docs_ok', type: 'yes_no', label: 'เอกสารรถ (พรบ. ทะเบียน ประกัน) ครบถ้วน', required: true },
      {
        id: 'safety_knowledge',
        type: 'single',
        label: 'ก่อนออกรถ หากพบความผิดปกติที่อาจไม่ปลอดภัย ควรทำอย่างไร?',
        options: ['แจ้งหัวหน้า/ช่าง และไม่ออกรถจนกว่าจะแก้ไข', 'ออกรถไปก่อนแล้วค่อยแจ้งทีหลัง', 'ขับช้าๆ ไปก่อน'],
        required: true,
      },
      { id: 'notes', type: 'textarea', label: 'หมายเหตุ / สิ่งที่ต้องแจ้งซ่อม', placeholder: 'ทางเลือก' },
    ],
  },
  {
    key: 'fuel_refill',
    qrLabel: 'สแกนเมื่อเติมน้ำมัน',
    stickerNote: 'สติกเกอร์ชุดที่ 2',
    title: 'บันทึกการเติมน้ำมัน',
    trainingTopic:
      'การบันทึกการเติมน้ำมันอย่างถูกต้อง — เลขไมล์ สถานที่เติม ปริมาณลิตร ค่าใช้จ่าย และใบเสร็จ เพื่อควบคุมต้นทุนและตรวจสอบย้อนหลัง',
    whenToUse: 'ทุกครั้งหลังเติมน้ำมันเสร็จ',
    questions: [
      { id: 'driver_name', type: 'text', label: 'ชื่อผู้ขับ', required: true },
      { id: 'plate', type: 'text', label: 'ทะเบียนรถ', required: true },
      { id: 'odometer', type: 'text', label: 'เลขไมล์ ณ เวลาเติม', required: true },
      { id: 'station', type: 'text', label: 'สถานที่เติม (ปั๊ม/สาขา)', required: true },
      { id: 'liters', type: 'text', label: 'ปริมาณ (ลิตร)', required: true },
      { id: 'amount', type: 'text', label: 'จำนวนเงิน (บาท)', required: true },
      {
        id: 'receipt_kept',
        type: 'yes_no',
        label: 'เก็บใบเสร็จ / หลักฐานการเติมไว้ครบถ้วน',
        required: true,
      },
      {
        id: 'fuel_knowledge',
        type: 'single',
        label: 'ทำไมต้องบันทึกเลขไมล์ทุกครั้งที่เติมน้ำมัน?',
        options: [
          'เพื่อตรวจสอบอัตราสิ้นเปลืองและควบคุมต้นทุน',
          'เพื่อตกแต่งบันทึกให้สวย',
          'ไม่จำเป็นต้องบันทึก',
        ],
        required: true,
      },
      { id: 'notes', type: 'textarea', label: 'หมายเหตุเพิ่มเติม', placeholder: 'ทางเลือก' },
    ],
  },
  {
    key: 'daily_driver_check',
    qrLabel: 'Daily Driver Check Sheet',
    stickerNote: 'สติกเกอร์ชุดที่ 3',
    title: 'Daily Driver Check Sheet',
    trainingTopic:
      'รักษาสุขภาพร่างกายแข็งแรง เพื่อตนเองและครอบครัว พร้อมบริการให้ดีที่สุดในวันนี้ — ตรวจสุขภาพและความพร้อมก่อนปฏิบัติหน้าที่ขับรถ',
    whenToUse: 'ทุกวันก่อนเริ่มงาน / ก่อนออกรถ',
    questions: [
      { id: 'driver_name', type: 'text', label: 'ชื่อผู้ขับ', required: true },
      { id: 'rested', type: 'yes_no', label: 'นอนพักเพียงพอ ไม่มีอาการง่วงหลับรุนแรง', required: true },
      { id: 'no_alcohol', type: 'yes_no', label: 'ไม่ดื่มแอลกอฮอล์ภายใน 12 ชม. ก่อนขับรถ', required: true },
      { id: 'fit_to_drive', type: 'yes_no', label: 'ร่างกายและจิตใจพร้อมขับรถอย่างปลอดภัย', required: true },
      { id: 'medication_safe', type: 'yes_no', label: 'ไม่ใช้ยาที่มีผลต่อการขับขี่ (หรือได้รับอนุญาตแล้ว)', required: true },
      {
        id: 'health_knowledge',
        type: 'single',
        label: 'หากรู้สึกไม่สบายกลางวัน ควรทำอย่างไร?',
        options: ['หยุดขับ แจ้งหัวหน้า และขอความช่วยเหลือ', 'พยายามขับต่อไปให้ถึงปลายทาง', 'ดื่มกาแฟแล้วขับต่อ'],
        required: true,
      },
      { id: 'notes', type: 'textarea', label: 'อาการ / หมายเหตุเพิ่มเติม', placeholder: 'ทางเลือก' },
    ],
  },
];

export function getFleetExam(key: string): FleetExam | undefined {
  return FLEET_EXAMS.find((e) => e.key === key);
}

export function isValidFleetExamKey(key: string): boolean {
  return FLEET_EXAMS.some((e) => e.key === key);
}
