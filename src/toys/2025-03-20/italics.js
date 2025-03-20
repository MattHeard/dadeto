/**
 * Adds HTML <em> tags around text marked with Markdown italics while preserving
 * the original Markdown characters.
 * 
 * Handles both *single asterisk* and _underscore_ style Markdown italics.
 * 
 * @param {string} text - The input text that may contain Markdown italics syntax
 * @returns {string} Text with HTML <em> tags added around Markdown-formatted italics
 */
export function italics(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Handle *asterisk* style italics
  let result = text.replace(/\*(.*?)\*/g, '<em>*$1*</em>');
  
  // Handle _underscore_ style italics
  result = result.replace(/_(.*?)_/g, '<em>_$1_</em>');
  
  return result;
}
