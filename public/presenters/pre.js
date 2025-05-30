// Pre-formatted text presenter
// Creates a <pre> element with the given string as its text content using a DOM abstraction

/**
 * Create a <pre> DOM element with pre-formatted text.
 * @param {string} inputString - The text to display (may include newlines and spaces).
 * @param {object} dom - An object with createElement and setTextContent methods.
 * @returns {HTMLElement} The <pre> element with the provided text content.
 */
function isSurroundedByBrackets(str) {
  return str.startsWith('[') && str.endsWith(']');
}

function isBracketedListString(str) {
  return typeof str === 'string' && isSurroundedByBrackets(str);
}

function formatBracketedListString(inputString) {
  const inner = inputString.slice(1, -1).trim();
  if (inner.length > 0) {
    return inner.split(',').map(s => s.trim()).join('\n');
  } else {
    return '';
  }
}

function getPreContent(inputString) {
  if (isBracketedListString(inputString)) {
    return formatBracketedListString(inputString);
  }
  return inputString;
}

export function createPreElement(inputString, dom) {
  const pre = dom.createElement('pre');
  const content = getPreContent(inputString);
  dom.setTextContent(pre, content);
  return pre;
}
