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
};

export const FLEET_FORM_LINKS: FleetFormLink[] = [
  {
    key: 'start_work_inspection',
    qrLabel: 'สแกนเมื่อเริ่มงาน',
    title: 'บันทึกการตรวจสภาพรถ (ประจำตำแหน่ง)',
    trainingTopic:
      'การตรวจสภาพรถก่อนออกปฏิบัติงาน — ความปลอดภัย อุปกรณ์ ไฟ ยาง เบรก เอกสารรถ และการบันทึกเลขไมล์ก่อนใช้งาน',
    whenToUse: 'ทุกครั้งก่อนเริ่มงาน / ก่อนออกรถ',
    url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ003OFpUWllVQkVCMkszN0hKMFRGSzhTNy4u',
  },
  {
    key: 'fuel_refill',
    qrLabel: 'สแกนเมื่อเติมน้ำมัน',
    title: 'บันทึกการเติมน้ำมัน',
    trainingTopic:
      'การบันทึกการเติมน้ำมันอย่างถูกต้อง — เลขไมล์ สถานที่เติม ปริมาณลิตร ค่าใช้จ่าย และใบเสร็จ เพื่อควบคุมต้นทุนและตรวจสอบย้อนหลัง',
    whenToUse: 'ทุกครั้งหลังเติมน้ำมันเสร็จ',
    url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUMTlDR0Y0MFlWREVINzEzMFNNNFZSWVBEQi4u',
  },
];
