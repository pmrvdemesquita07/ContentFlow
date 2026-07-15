function toCsvValue(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const UTF8_BOM = String.fromCharCode(0xfeff);

/**
 * Builds an Excel/Sheets-compatible CSV string - no dependency needed since
 * CSV is plain text. Two things Excel needs or it garbles the file:
 * - A UTF-8 BOM, or accented characters render as mojibake (e.g. "Heróis"
 *   becomes "HerÃ³is").
 * - A "sep=," directive on its own first line, or European-locale Excel
 *   (which uses "," as the decimal separator) assumes ";" as the column
 *   separator instead and dumps every field into column A.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(toCsvValue).join(",")];
  for (const row of rows) {
    lines.push(row.map(toCsvValue).join(","));
  }
  return UTF8_BOM + "sep=,\r\n" + lines.join("\r\n");
}
