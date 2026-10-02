import ExcelJS from 'exceljs';

import type { RawRosterRow } from './import';

export interface ParsedSpreadsheet {
  readonly headers: readonly string[];
  readonly rows: readonly RawRosterRow[];
}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number' || typeof cell === 'boolean') return String(cell).trim();
  if (cell instanceof Date) return cell.toISOString().trim();
  if (typeof cell === 'object' && 'text' in (cell as Record<string, unknown>)) {
    return String((cell as Record<string, unknown>).text).trim();
  }
  if (typeof cell === 'object' && 'result' in (cell as Record<string, unknown>)) {
    return String((cell as Record<string, unknown>).result).trim();
  }
  return '';
}

function parseCsv(text: string): { headers: string[]; dataRows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], dataRows: [] };

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const [headerLine, ...contentLines] = lines;
  const headers = parseLine(headerLine ?? '');
  const dataRows = contentLines.map(parseLine);
  return { headers, dataRows };
}

/** Reads an .xlsx or .csv file into header + rows without depending on vulnerable SheetJS. */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv') || file.type === 'text/csv') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const { headers, dataRows } = parseCsv(text);
    const rows: RawRosterRow[] = dataRows
      .map((values, index) => {
        const record: Record<string, string> = {};
        headers.forEach((header, columnIndex) => {
          record[header] = cellToString(values[columnIndex]);
        });
        return { rowIndex: index, values: record };
      })
      .filter((row) => Object.values(row.values).some((value) => value.length > 0));

    return { headers, rows };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [] };

  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell.value);
  });

  const rows: RawRosterRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      const cellValue = row.getCell(colIndex + 1).value;
      record[header] = cellToString(cellValue);
    });
    if (Object.values(record).some((v) => v.length > 0)) {
      rows.push({ rowIndex: rowNumber - 2, values: record });
    }
  });

  return { headers: headers.filter(Boolean), rows };
}
