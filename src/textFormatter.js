// textFormatter.js

/**
 * Formats the given text.
 *
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
/**
 * Base formatter class implementing the Chain of Responsibility pattern
 */
class TextFormatter {
  constructor(next = null) {
    this.next = next;
  }
  
  /**
   * Set the next formatter in the chain
   * @param {TextFormatter} formatter - The next formatter in the chain
   * @returns {TextFormatter} - The formatter that was set as next
   */
  setNext(formatter) {
    this.next = formatter;
    return formatter;
  }
  
  /**
   * Format the text or pass to the next formatter in the chain
   * @param {string} text - The text to format
   * @returns {string} - The formatted text
   */
  format(text) {
    const result = this.processText(text);
    if (result) return result;
    
    if (this.next) {
      return this.next.format(text);
    }
    
    return text;
  }
  
  /**
   * Process the text (to be implemented by subclasses)
   * @param {string} text - The text to process
   * @returns {string|null} - The processed text or null if not processed
   */
  processText(text) {
    return null; // Default implementation does nothing
  }
}

/**
 * Formatter for text wrapped in double asterisks
 */
class AsteriskFormatter extends TextFormatter {
  processText(text) {
    return this.processDelimiter(text, '**');
  }
  
  processDelimiter(text, delimiter) {
    const startIndex = text.indexOf(delimiter);
    if (startIndex === -1) return null;
    
    const endIndex = text.indexOf(delimiter, startIndex + delimiter.length);
    if (endIndex === -1) return null;
    
    const beforeText = text.substring(0, startIndex);
    const boldText = text.substring(startIndex, endIndex + delimiter.length);
    const afterText = text.substring(endIndex + delimiter.length);
    
    return beforeText + `<strong>${boldText}</strong>` + afterText;
  }
}

/**
 * Formatter for text wrapped in double underscores
 */
class UnderscoreFormatter extends TextFormatter {
  processText(text) {
    return this.processDelimiter(text, '__');
  }
  
  processDelimiter(text, delimiter) {
    const startIndex = text.indexOf(delimiter);
    if (startIndex === -1) return null;
    
    const endIndex = text.indexOf(delimiter, startIndex + delimiter.length);
    if (endIndex === -1) return null;
    
    const beforeText = text.substring(0, startIndex);
    const boldText = text.substring(startIndex, endIndex + delimiter.length);
    const afterText = text.substring(endIndex + delimiter.length);
    
    return beforeText + `<strong>${boldText}</strong>` + afterText;
  }
}

/**
 * Set up the chain of formatters
 */
const setupFormatterChain = () => {
  const asteriskFormatter = new AsteriskFormatter();
  const underscoreFormatter = new UnderscoreFormatter();
  
  asteriskFormatter.setNext(underscoreFormatter);
  
  return asteriskFormatter;
};

// Create the formatter chain once
const formatterChain = setupFormatterChain();

/**
 * Format the given text using the chain of formatters
 * @param {string} text - The text to format
 * @returns {string} - The formatted text
 */
export function getFormattedText(text) {
  return formatterChain.format(text);
}
