function toCsvValue(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Builds an Excel/Sheets-compatible CSV string - no dependency needed since CSV is plain text. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(toCsvValue).join(",")];
  for (const row of rows) {
    lines.push(row.map(toCsvValue).join(","));
  }
  return lines.join("\n");
}
