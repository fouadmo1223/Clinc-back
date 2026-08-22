import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

export interface ExportColumn {
  key: string;
  label: string;
}

@Injectable()
export class ExportService {
  buildCsv(columns: ExportColumn[], rows: Record<string, unknown>[]): Buffer {
    const escape = (value: unknown): string => {
      const s = value === undefined || value === null ? '' : String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [columns.map((c) => escape(c.label)).join(',')];
    for (const row of rows) {
      lines.push(columns.map((c) => escape(row[c.key])).join(','));
    }
    // Leading BOM so Excel/Windows apps detect UTF-8 and render Arabic text correctly.
    const bom = String.fromCharCode(0xfeff);
    return Buffer.from(bom + lines.join('\r\n'), 'utf-8');
  }

  async buildXlsx(sheetName: string, columns: ExportColumn[], rows: Record<string, unknown>[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });
    sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 22 }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) sheet.addRow(row);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
