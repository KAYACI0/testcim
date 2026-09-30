import { read, utils } from 'xlsx';

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
  return '';
}

/** Reads an .xlsx or .csv file (SheetJS auto-detects the format from content) into header + rows. */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) return { headers: [], rows: [] };

  const raw = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const [headerRow, ...dataRows] = raw;
  const headers = (headerRow ?? []).map((cell) => cellToString(cell));

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
