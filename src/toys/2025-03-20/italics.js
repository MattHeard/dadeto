/**
 * Adds HTML <em> tags around text marked with Markdown italics while preserving
 * the original Markdown characters.
 * 
 * Handles both *single asterisk* and _underscore_ style Markdown italics.
 * Does NOT add <em> tags around bold markdown syntax (** or __).
 * 
 * @param {string} text - The input text that may contain Markdown italics syntax
 * @returns {string} Text with HTML <em> tags added around Markdown-formatted italics
 */
export function italics(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // We'll use a recursive approach with special handling for bold segments
  return processText(text);
}

/**
 * Process text recursively to handle all formatting cases
 * @param {string} text - The text to process
 * @returns {string} - Processed text with HTML tags added
 */
function processText(text) {
  // First, identify any bold patterns
  const boldMatch = text.match(/(?:\*\*.*?\*\*)|(?:__.*?__)/s);
  
  if (!boldMatch) {
    // No bold pattern found, process italics only
    return processItalics(text);
  }
  
  const boldText = boldMatch[0];
  const boldStartIndex = boldMatch.index;
  const boldEndIndex = boldStartIndex + boldText.length;
  
  // Text before the bold section
  const beforeText = text.substring(0, boldStartIndex);
  // Text after the bold section
  const afterText = text.substring(boldEndIndex);
  
  // Process text before and after the bold section for italics
  const processedBeforeText = processItalics(beforeText);
  const processedAfterText = processText(afterText); // Continue processing the rest recursively
  
  // Combine the processed sections with the unchanged bold text
  return processedBeforeText + boldText + processedAfterText;
}

/**
 * Process just the italic markdown in text
 * @param {string} text - The text to process
 * @returns {string} - Text with italic markdown wrapped in <em> tags
 */
function processItalics(text) {
  let result = text;
  
  // Process *asterisk* style italics
  result = result.replace(/\*(.*?)\*/g, '<em>*$1*</em>');
  
  // Process _underscore_ style italics 
  result = result.replace(/_(.*?)_/g, '<em>_$1_</em>');
  
  return result;
}
