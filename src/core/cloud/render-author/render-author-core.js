import { renderHtmlTemplate } from '../html-template.js';

/** @typedef {{ collectionGroup?: (name: string) => { where: Function } }} AuthorDatabase */

/**
 * Render an author landing page from an author document.
 * @param {{ uuid?: string, name?: string, authorName?: string }} author Author data.
 * @param {Array<{ pageNumber: number, name?: string, content?: string }>} [variants] Author variants.
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
  if (items) {
    return `<h2>Page variants</h2><ol>${items}</ol>`;
  }

  return '';
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
 * @returns {Promise<Array<{ pageNumber: number, name: string, content: string }>>} Variants.
 */
async function getAuthorVariants(db, authorId) {
  if (!db?.collectionGroup) return [];
  const snapshot = await db
    .collectionGroup('variants')
    .where('authorId', '==', authorId)
    .get();
  const variants = [];
  for (const doc of snapshot.docs) {
    const variant = await readAuthorVariant(doc);
    if (variant) variants.push(variant);
  }
  return variants;
}

/**
 * Read one visible author variant document.
 * @param {{ data: () => { visibility?: number, name?: unknown, content?: unknown }, ref?: { parent?: { parent?: { get: Function } } } }} doc Variant document.
 * @returns {Promise<{ pageNumber: number, name: string, content: string } | null>} Variant or null.
 */
async function readAuthorVariant(doc) {
  const data = doc.data();
  if (!isVisibleVariant(data)) return null;
  const pageRef = doc.ref?.parent?.parent;
  if (!pageRef) return null;
  const page = (await pageRef.get()).data();
  const pageNumber = page?.number;
  const name = data.name;
  if (!isValidAuthorVariant(pageNumber, name)) return null;

  return createAuthorVariant(
    pageNumber,
    /** @type {string} */ (name),
    data.content
  );
}

/* istanbul ignore next */
/**
 * Validate the fields required for an author variant.
 * @param {unknown} pageNumber Candidate page number.
 * @param {unknown} name Candidate variant name.
 * @returns {boolean} Whether both fields are valid.
 */
function isValidAuthorVariant(pageNumber, name) {
  return typeof pageNumber === 'number' && typeof name === 'string';
}

/**
 * Create a normalized author variant.
 * @param {number} pageNumber Page number.
 * @param {string} name Variant name.
 * @param {unknown} content Variant content.
 * @returns {{ pageNumber: number, name: string, content: string }} Normalized variant.
 */
function createAuthorVariant(pageNumber, name, content) {
  return { pageNumber, name, content: String(content ?? '') };
}

/* istanbul ignore next */
/**
 * Check whether a variant should appear on the author page.
 * @param {{ visibility?: number }} data Variant data.
 * @returns {boolean} Whether the variant is visible.
 */
function isVisibleVariant(data) {
  return (data.visibility ?? 1) >= 0.5;
}
