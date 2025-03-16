export function getHtmlFromMarkdown(markdown) {
  // Basic implementation for converting markdown to HTML
  return markdown.replace(/^# (.*$)/gim, '<h1>$1</h1>');
}
