// CSV that opens correctly in Excel and Google Sheets.

type Cell = string | number | null | undefined;

/**
 * Quotes every text cell and doubles inner quotes. Text starting with = + - @ (or a tab/CR) gets a
 * leading ' so a spreadsheet shows it as text instead of running it as a formula (CSV injection).
 * Numbers stay plain so they can be added up.
 */
export function toCSV(rows: Cell[][]): string {
  const cell = (v: Cell) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v);
    const safe = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  // BOM so Excel reads Urdu names and "·" as UTF-8; CRLF line ends as the CSV standard says.
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
