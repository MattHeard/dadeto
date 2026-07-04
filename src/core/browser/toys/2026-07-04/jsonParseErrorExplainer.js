/**
 * Parse malformed JSON and return a structured error payload when parsing fails.
 * @param {string} input JSON text.
 * @returns {string} JSON string with the parsed value or a structured error object.
 */
export function jsonParseErrorExplainer(input) {
  try {
    return JSON.stringify({
      ok: true,
      value: JSON.parse(input),
    });
  } catch (error) {
    return JSON.stringify(buildErrorPayload(input, error));
  }
}

/**
 * Build a structured parse error payload from a thrown JSON.parse error.
 * @param {string} input Original input text.
 * @param {unknown} error Thrown parse error.
 * @returns {{ ok: false, error: { message: string, approximateFailureLocation: { index: number | null, line: number | null, column: number | null }, originalInputLength: number } }} Structured error payload.
 */
function buildErrorPayload(input, error) {
  const location = extractLocation(error, input);
  let message = 'Invalid JSON input';
  if (error instanceof Error && error.message) {
    message = error.message;
  }
  return {
    ok: false,
    error: {
      message,
      approximateFailureLocation: location,
      originalInputLength: input.length,
    },
  };
}

/**
 * Extract the best available failure location from a JSON.parse error.
 * @param {unknown} error Thrown parse error.
 * @param {string} input Original input text.
 * @returns {{ index: number | null, line: number | null, column: number | null }} Approximate failure location.
 */
export function extractLocation(error, input) {
  let message = '';
  if (error instanceof Error) {
    message = error.message;
  }
  const positionMatch = message.match(/position\s+(\d+)/i);
  if (positionMatch) {
    const index = Number(positionMatch[1]);
    return toLineColumn(input, index);
  }

  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1]);
    const column = Number(lineColumnMatch[2]);
    return {
      index: null,
      line,
      column,
    };
  }

  return {
    index: null,
    line: null,
    column: null,
  };
}

/**
 * Convert a character index to 1-based line/column coordinates.
 * @param {string} input Original input text.
 * @param {number} index Zero-based character index.
 * @returns {{ index: number, line: number, column: number }} Line and column for the supplied index.
 */
export function toLineColumn(input, index) {
  let cappedIndex = 0;
  if (Number.isFinite(index)) {
    cappedIndex = Math.max(0, index);
  }
  const prefix = input.slice(0, cappedIndex);
  const lines = prefix.split('\n');
  return {
    index: cappedIndex,
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}
