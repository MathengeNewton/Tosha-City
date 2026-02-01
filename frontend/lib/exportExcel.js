import * as XLSX from "xlsx";

/**
 * Export an array of row objects to Excel.
 * @param {Object[]} rows - Array of objects (e.g. filtered table data)
 * @param {Array<{ key: string, label: string }>} columns - Column config: key = row property, label = sheet header
 * @param {string} filename - Download filename (without .xlsx)
 */
export function exportToExcel(rows, columns, filename = "export") {
  const headers = columns.map((c) => c.label);
  const keys = columns.map((c) => c.key);
  const data = rows.map((row) =>
    keys.map((key) => {
      const value = row[key];
      if (value == null) return "";
      if (typeof value === "object" && value instanceof Date) return value.toISOString();
      if (typeof value === "object") return JSON.stringify(value);
      return value;
    })
  );
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
