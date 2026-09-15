/**
 *
 * @param html
 * @param generatedAt
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
