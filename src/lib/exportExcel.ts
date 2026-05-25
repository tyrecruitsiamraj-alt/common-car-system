import * as XLSX from 'xlsx';

export type ExcelCell = string | number | boolean | null | undefined;

export type ExcelSheetInput = {
  sheetName: string;
  rows: Record<string, ExcelCell>[];
};

function safeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, '_').trim();
  return (cleaned || 'Sheet1').slice(0, 31);
}

/** ดาวน์โหลดไฟล์ .xlsx ในเบราว์เซอร์ */
export function downloadExcelFile(filename: string, sheets: ExcelSheetInput[]): void {
  const wb = XLSX.utils.book_new();
  for (const { sheetName, rows } of sheets) {
    const data = rows.length > 0 ? rows : [{ ข้อมูล: '(ว่าง)' }];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
  }
  const base = filename.replace(/\.xlsx$/i, '');
  XLSX.writeFile(wb, `${base}.xlsx`);
}
