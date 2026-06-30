/**
 * ดึงคำถามจาก Microsoft Forms runtime API แล้วเขียน src/data/fleetExamsFromMsForms.json
 * รัน: node scripts/sync-ms-forms-exams.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'src', 'data', 'fleetExamsFromMsForms.json');

/** ลำดับตาม QR ที่ผู้ใช้ให้ */
const EXAM_SOURCES = [
  {
    key: 'daily_driver_check',
    msFormId: 'XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ1dDTDA5Nk05UkRZUVNYR01SQ0xUV1BFUS4u',
    qrLabel: 'Daily Driver Check Sheet',
    stickerNote: 'สติกเกอร์ชุดที่ 1',
    whenToUse: 'ทุกวันก่อนเริ่มงาน / ก่อนออกรถ',
    url:
      'https://forms.office.com/pages/responsepage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ1dDTDA5Nk05UkRZUVNYR01SQ0xUV1BFUS4u&origin=QRCode&qrcodeorigin=presentation&route=shorturl',
  },
  {
    key: 'start_work_sticker_single',
    msFormId: 'XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ003OFpUWllVQkVCMkszN0hKMFRGSzhTNy4u',
    qrLabel: 'สแกนเมื่อเริ่มงาน',
    stickerNote: 'สติกเกอร์ชุดที่ 2',
    whenToUse: 'ทุกครั้งก่อนเริ่มงาน / ก่อนออกรถ',
    url:
      'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ003OFpUWllVQkVCMkszN0hKMFRGSzhTNy4u&origin=QRCode',
  },
  {
    key: 'fuel_refill',
    msFormId: 'XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUMTlDR0Y0MFlWREVINzEzMFNNNFZSWVBEQi4u',
    qrLabel: 'บันทึกการเติมน้ำมัน',
    stickerNote: 'สติกเกอร์ชุดที่ 3',
    whenToUse: 'ทุกครั้งที่เติมน้ำมัน',
    url:
      'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUMTlDR0Y0MFlWREVINzEzMFNNNFZSWVBEQi4u&origin=QRCode',
  },
];

function dedupeQuestions(questions) {
  const seen = new Set();
  return questions.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}

/** ตัดเฉพาะตารางอุปกรณ์ "(กรอกเมื่อแทนงาน)" ออก — เก็บ 15 ข้อตรงตาม MS Forms (คงข้อ "คุณไปแทนงานหรือไม่") */
function trimCoreInspectionQuestions(questions) {
  const idx = questions.findIndex((q) => /กรอกเมื่อแทนงาน/.test(q.label));
  if (idx < 0) return questions;
  return questions.slice(0, idx);
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugId(msId) {
  return `ms_${msId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
}

function mapDriverPlateAlias(id, title) {
  const t = title.toLowerCase();
  if (/ชื่อไดร์เวอร์|ชื่อจริง/.test(title)) return 'driver_name';
  if (/ทะเบียน/.test(title)) return 'plate';
  return slugId(id);
}

async function fetchRuntimeForm(msFormId) {
  const pageUrl = `https://forms.office.com/Pages/ResponsePage.aspx?id=${encodeURIComponent(msFormId)}`;
  const page = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  const html = await page.text();
  const cookies = page.headers.getSetCookie?.() ?? [];
  const cookie = cookies.map((c) => c.split(';')[0]).join('; ');
  const tenant = html.match(/formapi\/api\/([a-f0-9-]{36})\//i)?.[1];
  const user = html.match(/users\/([a-f0-9-]{36})\//i)?.[1];
  if (!tenant || !user) throw new Error(`Cannot resolve tenant/user for form ${msFormId}`);
  const runtime = `https://forms.office.com/formapi/api/${tenant}/users/${user}/light/runtimeForms('${msFormId}')?$expand=questions($expand=choices)`;
  const r = await fetch(runtime, {
    headers: { Accept: 'application/json', Cookie: cookie, Referer: pageUrl, 'User-Agent': 'Mozilla/5.0' },
  });
  if (!r.ok) throw new Error(`runtime ${r.status} for ${msFormId}`);
  return r.json();
}

function matrixGroupChoices(groupQuestion) {
  if (!groupQuestion?.choices?.length) return [];
  return [...groupQuestion.choices]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((c) => stripHtml(c.displayText || c.description || ''))
    .filter(Boolean);
}

function convertQuestions(rawQuestions) {
  const sorted = [...rawQuestions].sort((a, b) => a.order - b.order);

  // รวมตาราง (matrix) ให้เป็น 1 ข้อ: หัวข้อกลุ่ม + ตัวเลือกร่วม + แถวย่อยหลายแถว
  const groups = new Map();
  for (const q of sorted) {
    if (q.type === 'Question.MatrixChoiceGroup') {
      groups.set(q.id, { options: matrixGroupChoices(q), rows: [] });
    }
  }
  for (const q of sorted) {
    if (q.type === 'Question.MatrixChoice') {
      groups.get(q.groupId)?.rows.push({ id: slugId(q.id), label: stripHtml(q.title) });
    }
  }

  const out = [];
  for (const q of sorted) {
    const title = stripHtml(q.title);

    let info = {};
    try {
      info = JSON.parse(q.questionInfo || '{}');
    } catch {
      /* */
    }

    if (q.type === 'Question.MatrixChoiceGroup') {
      if (!title) continue;
      const g = groups.get(q.id);
      out.push({
        id: slugId(q.id),
        type: 'matrix',
        label: title,
        rows: g?.rows ?? [],
        options: g?.options?.length ? g.options : ['ปกติ', 'ผิดปกติ'],
        required: !!q.required,
      });
      continue;
    }

    if (q.type === 'Question.MatrixChoice') continue; // รวมเข้าไปในข้อ matrix แล้ว

    if (!title) continue;

    if (q.type === 'Question.TextField') {
      const multiline = !!info.Multiline;
      out.push({
        id: mapDriverPlateAlias(q.id, title),
        type: multiline ? 'textarea' : 'text',
        label: title,
        required: !!q.required,
      });
      continue;
    }

    if (q.type === 'Question.DateTime') {
      out.push({
        id: slugId(q.id),
        type: info.Time && !info.Date ? 'text' : 'date',
        label: title,
        required: !!q.required,
      });
      continue;
    }

    if (q.type === 'Question.Choice') {
      const choices = (info.Choices || [])
        .map((c) => stripHtml(c.Description || c.FormsProDisplayRTText || ''))
        .filter(Boolean);
      const id = slugId(q.id);
      if (info.ChoiceType === 2) {
        out.push({ id, type: 'multi', label: title, options: choices, required: !!q.required });
      } else if (choices.length === 2 && choices.includes('ใช่') && choices.includes('ไม่ใช่')) {
        out.push({ id, type: 'yes_no', label: title, required: !!q.required });
      } else {
        out.push({ id, type: 'single', label: title, options: choices, required: !!q.required });
      }
      continue;
    }
  }
  return out;
}

const exams = [];
for (const src of EXAM_SOURCES) {
  console.log('Fetching', src.key, '…');
  const data = await fetchRuntimeForm(src.msFormId);
  let questions = convertQuestions(data.questions || []);
  questions = dedupeQuestions(questions);
  if (src.key === 'start_work_sticker_single') {
    questions = trimCoreInspectionQuestions(questions);
  }
  const title =
    src.key === 'fuel_refill'
      ? 'บันทึกการเติมน้ำมัน'
      : stripHtml(data.title) || src.qrLabel;
  exams.push({
    key: src.key,
    qrLabel: src.qrLabel,
    stickerNote: src.stickerNote,
    title,
    trainingTopic: stripHtml(data.description || data.formsProRTDescription || '').replace(/<br\s*\/?>/gi, '\n'),
    whenToUse: src.whenToUse,
    msFormUrl: src.url,
    msFormId: src.msFormId,
    syncedAt: new Date().toISOString(),
    questions,
  });
  console.log(' ', data.title, '→', questions.length, 'fields');
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(exams, null, 2)}\n`, 'utf8');
console.log('Wrote', outPath);
