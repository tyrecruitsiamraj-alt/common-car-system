import * as XLSX from 'xlsx';

export type ExcelCell = string | number | boolean | null | undefined;

export type ExcelSheetFormat = {
  /** คอลัมน์ที่เก็บวันที่เป็นเลข serial ของ Excel (ดู ymdToExcelSerial) จะแสดงตาม dateFormat */
  dateColumns?: string[];
  dateFormat?: string;
  /** ความกว้างคอลัมน์ หน่วยเป็นจำนวนตัวอักษร */
  columnWidths?: Record<string, number>;
  /** เปิดปุ่มกรองที่แถวหัวตาราง */
  autoFilter?: boolean;
};

export type ExcelSheetInput = {
  sheetName: string;
  rows: Record<string, ExcelCell>[];
  format?: ExcelSheetFormat;
};

/** แปลง yyyy-MM-dd เป็นเลขวันที่ของ Excel คำนวณแบบ UTC เพื่อไม่ให้วันที่เลื่อนตาม timezone */
export function ymdToExcelSerial(ymd: string | undefined): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? '');
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}

function applySheetFormat(ws: XLSX.WorkSheet, headers: string[], rowCount: number, format: ExcelSheetFormat): void {
  const lastRow = rowCount;
  for (const column of format.dateColumns ?? []) {
    const c = headers.indexOf(column);
    if (c < 0) continue;
    for (let r = 1; r <= lastRow; r += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      if (cell?.t === 'n') cell.z = format.dateFormat ?? 'd-mmm-yy';
    }
  }
  if (format.columnWidths) {
    ws['!cols'] = headers.map((header) => ({ wch: format.columnWidths?.[header] ?? 12 }));
  }
  if (format.autoFilter && ws['!ref']) {
    ws['!autofilter'] = { ref: ws['!ref'] };
  }
}

function safeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, '_').trim();
  return (cleaned || 'Sheet1').slice(0, 31);
}

export function buildExcelWorkbook(sheets: ExcelSheetInput[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const { sheetName, rows, format } of sheets) {
    const data = rows.length > 0 ? rows : [{ ข้อมูล: '(ว่าง)' }];
    const ws = XLSX.utils.json_to_sheet(data);
    if (format && rows.length > 0) applySheetFormat(ws, Object.keys(rows[0]), rows.length, format);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
  }
  return wb;
}

/** ดาวน์โหลดไฟล์ .xlsx ในเบราว์เซอร์ */
export function downloadExcelFile(filename: string, sheets: ExcelSheetInput[]): void {
  const wb = buildExcelWorkbook(sheets);
  const base = filename.replace(/\.xlsx$/i, '');
  XLSX.writeFile(wb, `${base}.xlsx`);
}
