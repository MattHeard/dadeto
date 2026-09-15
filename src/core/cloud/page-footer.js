/**
 * Add a human-friendly generation timestamp to a complete HTML document.
 * @param {string} html Complete HTML document.
 * @param {Date} [generatedAt] Generation time.
 * @returns {string} HTML with a timestamp footer.
 */
export function withPageFooter(html, generatedAt = new Date()) {
  const timestamp = generatedAt.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
  return html.replace(
    '</body>',
    `    <footer><small>Page last updated at ${timestamp}</small></footer>\n  </body>`
  );
}
