import { renderHtmlTemplate } from '../html-template.js';

/**
 * Render an author landing page from an author document.
 * @param {{ uuid?: string, name?: string, authorName?: string }} author Author data.
 * @returns {{ path: string, html: string } | null} Render result or null when incomplete.
 */
export function renderAuthorPage(author) {
  if (!author?.uuid) {
    return null;
  }
  const authorName = author.name ?? author.authorName ?? '';
  return {
    path: `a/${author.uuid}.html`,
    html: renderHtmlTemplate(new URL('./author-page.html', import.meta.url), {
      authorName: escapeHtml(authorName),
    }),
  };
}

/**
 * Escape HTML text.
 * @param {unknown} value Value to escape.
 * @returns {string} Escaped text.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create the Firestore author-write handler.
 * @param {{ bucket: { file: (path: string) => { save: Function } }, deleteField: () => unknown }} deps Dependencies.
 * @returns {(change: any) => Promise<null>} Handler.
 */
export function createRenderAuthorHandler({ bucket, deleteField }) {
  return async change => {
    if (!change.after.exists) return null;
    const data = change.after.data();
    if (!data.dirty) return null;
    const rendered = renderAuthorPage(data);
    if (!rendered) return null;
    await bucket.file(rendered.path).save(rendered.html, {
      contentType: 'text/html',
    });
    await change.after.ref.update({ dirty: deleteField() });
    return null;
  };
}
