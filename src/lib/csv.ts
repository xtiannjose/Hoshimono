// RFC 4180 CSV for the admin import and export. Small enough to own, and
// spreadsheets (Excel, Google Sheets) are the expected source and target.

/** Rows of fields. Handles quotes, "" escapes, CRLF and a byte order mark. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const endRow = () => {
    row.push(field);
    // A fully blank line ("") is skipped; a line of empty fields is kept.
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
    field = "";
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      endRow();
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

// A spreadsheet runs a cell starting with these as a formula (CSV injection).
const FORMULA = /^[=+\-@\t\r]/;

function cell(value: string): string {
  const safe = FORMULA.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** CSV text with CRLF line ends, as spreadsheets expect. */
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(cell).join(",") + "\r\n").join("");
}
