/**
 * CSV parsing utilities shared by toy modules.
 * Implements a minimal RFC 4180 compatible line parser that supports
 * quoted fields with escaped quotes.
 */

/**
 * Parse a single CSV row into an array of field strings using RFC 4180 rules.
 * Returns `null` when the row contains malformed quotes.
 * @param {string} line
 * @returns {string[] | null}
 */
export function parseCsvLine(line) {
  if (typeof line !== 'string') {
    return null;
  }

  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(field);
      field = '';
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    return null;
  }

  fields.push(field);
  return fields;
}
