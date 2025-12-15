/**
 * CSV parsing utilities shared by toy modules.
 * Implements a minimal RFC 4180 compatible line parser that supports
 * quoted fields with escaped quotes.
 */

const QUOTE = '"';
const DELIMITER = ',';

/**
 * Parse a single CSV row into an array of field strings using RFC 4180 rules.
 * Returns `null` when the row contains malformed quotes.
 * @param {string} line CSV row to parse.
 * @returns {string[] | null} Array of field values or null when quoting is malformed.
 */
export function parseCsvLine(line) {
  if (typeof line !== 'string') {
    return null;
  }

  return new CsvLineParser(line).parse();
}

class CsvLineParser {
  constructor(line) {
    this.line = line;
    this.index = 0;
    this.fields = [];
    this.field = '';
    this.inQuotes = false;
  }

  parse() {
    while (this.hasMore()) {
      this.consume();
    }

    return this.finish();
  }

  hasMore() {
    return this.index < this.line.length;
  }

  consume() {
    if (this.consumeWithAdvance(this.consumeQuote)) {
      return;
    }

    this.consumeNonQuote();
  }

  consumeNonQuote() {
    if (this.consumeWithAdvance(this.consumeDelimiter)) {
      return;
    }

    this.appendCurrentChar();
  }

  appendCurrentChar() {
    this.field += this.currentChar();
    this.index += 1;
  }

  consumeQuote(char) {
    if (!this.isQuote(char)) {
      return false;
    }

    return this.toggleQuote();
  }

  isQuote(char) {
    return char === QUOTE;
  }

  toggleQuote() {
    if (!this.inQuotes) {
      this.inQuotes = true;
      return true;
    }

    return this.closeQuote();
  }

  closeQuote() {
    if (this.peek() === QUOTE) {
      this.field += QUOTE;
      return this.incrementIndexAndReturnTrue();
    }

    this.inQuotes = false;
    return true;
  }

  peek() {
    return this.line[this.index + 1];
  }

  consumeDelimiter(char) {
    if (!this.canConsumeDelimiter(char)) {
      return false;
    }

    this.commitField();
    return true;
  }

  consumeWithAdvance(handler) {
    if (handler.call(this, this.currentChar())) {
      return this.incrementIndexAndReturnTrue();
    }

    return false;
  }

  incrementIndexAndReturnTrue() {
    this.index += 1;
    return true;
  }

  canConsumeDelimiter(char) {
    return this.isDelimiter(char) && this.isOutsideQuotedField();
  }

  isDelimiter(char) {
    return char === DELIMITER;
  }

  isOutsideQuotedField() {
    return !this.inQuotes;
  }

  commitField() {
    this.fields.push(this.field);
    this.field = '';
  }

  currentChar() {
    return this.line[this.index];
  }

  finish() {
    if (this.inQuotes) {
      return null;
    }

    return [...this.fields, this.field];
  }
}
