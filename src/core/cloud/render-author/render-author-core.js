import { renderHtmlTemplate } from '../html-template.js';

/** @typedef {{ collectionGroup?: (name: string) => { where: Function } }} AuthorDatabase */

/**
 * Render an author landing page from an author document.
 * @param {{ uuid?: string, name?: string, authorName?: string }} author Author data.
 * @param {Array<{ pageNumber: number, name?: string, content?: unknown }>} [variants] Author variants.
 * @returns {{ path: string, html: string } | null} Render result or null when incomplete.
 */
export function renderAuthorPage(author, variants = []) {
  if (!author?.uuid) {
    return null;
  }
  const authorName = author.name ?? author.authorName ?? '';
  return {
    path: `a/${author.uuid}.html`,
    html: renderHtmlTemplate(new URL('./author-page.html', import.meta.url), {
      authorName: escapeHtml(authorName),
      variants: renderVariants(variants),
    }),
  };
}

/**
 * Render author variant links using the same five-word snippet as the alts page.
 * @param {Array<{ pageNumber: number, name?: string, content?: string }>} variants Variants.
 * @returns {string} Variant list HTML.
 */
function renderVariants(variants) {
  const items = [...variants]
    .sort(
      (left, right) =>
        left.pageNumber - right.pageNumber ||
        String(left.name ?? '').localeCompare(String(right.name ?? ''))
    )
    .map(variant => {
      const snippet = String(variant.content ?? '')
        .split(/\s+/)
        .slice(0, 5)
        .join(' ');
      return `<li><a href="/p/${variant.pageNumber}${escapeHtml(variant.name)}.html">${escapeHtml(snippet)}</a></li>`;
    })
    .join('');
  return items ? `<h2>Page variants</h2><ol>${items}</ol>` : '';
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
 * @param {{ bucket: { file: (path: string) => { save: Function } }, db?: AuthorDatabase, deleteField: () => unknown }} deps Dependencies.
 * @returns {(change: any) => Promise<null>} Handler.
 */
export function createRenderAuthorHandler({ bucket, db, deleteField }) {
  return async change => {
    if (!change.after.exists) return null;
    const data = change.after.data();
    if (!data.dirty) return null;
    const variants = await getAuthorVariants(db, change.after.ref.id);
    const rendered = renderAuthorPage(data, variants);
    if (!rendered) return null;
    await bucket.file(rendered.path).save(rendered.html, {
      contentType: 'text/html',
    });
    await change.after.ref.update({ dirty: deleteField() });
    return null;
  };
}

/**
 * @param {AuthorDatabase | undefined} db Database.
 * @param {string} authorId Author document id.
 * @returns {Promise<Array<{ pageNumber: number, name: string, content: unknown }>>} Variants.
 */
async function getAuthorVariants(db, authorId) {
  if (!db?.collectionGroup) return [];
  const snapshot = await db
    .collectionGroup('variants')
    .where('authorId', '==', authorId)
    .get();
  const variants = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if ((data.visibility ?? 1) < 0.5) continue;
    const pageRef = doc.ref?.parent?.parent;
    const page = pageRef ? (await pageRef.get()).data() : undefined;
    if (typeof page?.number !== 'number' || typeof data.name !== 'string')
      continue;
    variants.push({
      pageNumber: page.number,
      name: data.name,
      content: data.content,
    });
  }
  return variants;
}
