/**
 * Just enough CSV for the shape most science APIs still publish: a header row,
 * comma separators, and optional double quotes. Not a general CSV library — it is
 * deliberately small enough to read and test.
 */
export type Row = Record<string, string>;

/** Splits one line, honouring quoted fields and doubled quotes inside them. */
export const splitLine = (line: string): string[] => {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields.map((value) => value.trim());
};

export interface Table {
  readonly columns: string[];
  readonly rows: Row[];
}

/**
 * Returns the header separately from the rows, so a caller can reject a file whose
 * columns are wrong even when it carries no data — an empty CSV and a CSV that is
 * actually an HTML error page are different problems.
 */
export const parseCsv = (text: string): Table => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const [header, ...rest] = lines;
  if (header === undefined) {
    return { columns: [], rows: [] };
  }

  const columns = splitLine(header);
  const rows = rest.map((line) => {
    const values = splitLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
  });

  return { columns, rows };
};
