import * as XLSX from "xlsx";

function rowToCells(row, keys) {
  return keys.map((key) => {
    const value = row[key];
    if (value == null) return "";
    if (typeof value === "object" && value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    return value;
  });
}

/**
 * Export an array of row objects to Excel (single sheet).
 * @param {Object[]} rows - Array of objects (e.g. filtered table data)
 * @param {Array<{ key: string, label: string }>} columns - Column config: key = row property, label = sheet header
 * @param {string} filename - Download filename (without .xlsx)
 */
export function exportToExcel(rows, columns, filename = "export") {
  const headers = columns.map((c) => c.label);
  const keys = columns.map((c) => c.key);
  const data = rows.map((row) => rowToCells(row, keys));
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export one or more tables into a single CSV file, separated by a blank line and an optional title row.
 * @param {Array<{ title?: string, rows: Object[], columns: Array<{ key: string, label: string }> }>} sections
 * @param {string} filename - Download filename (without .csv)
 */
export function exportToCsv(sections, filename = "export") {
  const aoa = [];
  sections.forEach(({ title, rows, columns }, i) => {
    if (i > 0) aoa.push([]);
    if (title) aoa.push([title]);
    const keys = columns.map((c) => c.key);
    aoa.push(columns.map((c) => c.label));
    rows.forEach((row) => aoa.push(rowToCells(row, keys)));
  });
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa));
  // BOM so Excel opens the file as UTF-8 (KES signs, dashes).
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export multiple sheets into one Excel workbook.
 * @param {Array<{ sheetName: string, rows: Object[], columns: Array<{ key: string, label: string }> }>} sheets - One object per sheet (sheetName max 31 chars)
 * @param {string} filename - Download filename (without .xlsx)
 */
export function exportToExcelMultiSheet(sheets, filename = "export") {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ sheetName, rows, columns }) => {
    const safeName = String(sheetName).slice(0, 31);
    const headers = columns.map((c) => c.label);
    const keys = columns.map((c) => c.key);
    const data = rows.map((row) => rowToCells(row, keys));
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
