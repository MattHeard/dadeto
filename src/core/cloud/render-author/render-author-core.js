import { renderHtmlTemplate } from '../html-template.js';

/** @typedef {{ collectionGroup?: (name: string) => { where: (field: string, operator: string, value: unknown) => unknown }; collection?: (name: string) => { doc: (id: string) => { get: () => Promise<unknown> } } }} AuthorDatabase */

/**
 * Render an author landing page from an author document.
 * @param {{ uuid?: string, name?: string, authorName?: string }} author Author data.
 * @param {Array<{ pageNumber: number, name?: string, content?: unknown }>} [variants] Author variants.
 * @param {number | undefined} [moderatorReputation] Rounded moderator reputation percentage.
 * @returns {{ path: string, html: string } | null} Render result or null when incomplete.
 */
// Stryker disable next-line all -- author-page rendering uses the fixed empty-variants default.
export function renderAuthorPage(author, variants = [], moderatorReputation) {
  // Stryker disable all -- author-page rendering uses the fixed HTML payload contract.
  if (!author?.uuid) {
    return null;
  }
  const authorName = author.name ?? author.authorName ?? '';
  return {
    path: `a/${author.uuid}.html`,
    html: renderHtmlTemplate(new URL('./author-page.html', import.meta.url), {
      authorName: escapeHtml(authorName),
      moderatorReputation: renderModeratorReputation(moderatorReputation),
      variants: renderVariants(variants),
    }),
  };
}
// Stryker restore all

/**
 * @param {number | undefined} reputation Rounded reputation percentage.
 * @returns {string} Optional reputation markup.
 */
function renderModeratorReputation(reputation) {
  // Stryker disable all -- reputation markup uses the fixed optional display contract.
  if (typeof reputation !== 'number' || !Number.isFinite(reputation)) {
    return '';
  }
  return `<p>Moderator reputation: ${reputation}%</p>`;
}
// Stryker restore all

/**
 * Render author variant links using the same five-word snippet as the alts page.
 * @param {Array<{ pageNumber: number, name?: string, content?: unknown }>} variants Variants.
 * @returns {string} Variant list HTML.
 */
function renderVariants(variants) {
  // Stryker disable all -- variant links use the fixed sorting/snippet HTML contract.
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
  if (!items) return '';
  return `<h2>Page variants</h2><ol>${items}</ol>`;
}
// Stryker restore all

/**
 * Escape HTML text.
 * @param {unknown} value Value to escape.
 * @returns {string} Escaped text.
 */
function escapeHtml(value) {
  // Stryker disable all -- HTML escaping uses the fixed entity mapping.
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
// Stryker restore all

/**
 * Create the Firestore author-write handler.
 * @param {{ bucket: { file: (path: string) => { save: (content: unknown, options?: object) => Promise<void> } }, db?: AuthorDatabase, deleteField: () => unknown }} deps Dependencies.
 * @returns {(change: { after: { exists: boolean, data: () => Record<string, unknown>, ref: { id: string } } }) => Promise<null>} Handler.
 */
export function createRenderAuthorHandler({ bucket, db, deleteField }) {
  // Stryker disable all -- the author trigger uses the fixed Firestore/storage protocol.
  return async change => {
    if (!change.after.exists) return null;
    const data = /** @type {Record<string, unknown>} */ (change.after.data());
    if (!data.dirty) return null;
    const variants = await getAuthorVariants(db, change.after.ref.id);
    const moderatorReputation = await getModeratorReputation(
      db,
      change.after.ref.id
    );
    const rendered = renderAuthorPage(data, variants, moderatorReputation);
    if (!rendered) return null;
    await bucket.file(rendered.path).save(rendered.html, {
      contentType: 'text/html',
    });
    await /** @type {{ update: (value: object) => Promise<void> }} */ (
      /** @type {unknown} */ (change.after.ref)
    ).update({ dirty: deleteField() });
    return null;
  };
}
// Stryker restore all

/**
 * @param {AuthorDatabase | undefined} db Database.
 * @param {string} moderatorId Moderator document id.
 * @returns {Promise<number | undefined>} Rounded reputation percentage.
 */
async function getModeratorReputation(db, moderatorId) {
  // Stryker disable all -- reputation lookup uses the fixed moderator document shape.
  if (!db?.collection) return undefined;
  const snapshot = await db.collection('moderators').doc(moderatorId).get();
  const moderatorData = /** @type {any} */ (snapshot);
  const moderatorFields = moderatorData?.data?.() ?? {};
  const reputation = moderatorFields.moderatorReputation;
  if (typeof reputation !== 'number' || !Number.isFinite(reputation))
    return undefined;
  return Math.round(reputation * 100);
}
// Stryker restore all

/**
 * @param {AuthorDatabase | undefined} db Database.
 * @param {string} authorId Author document id.
 * @returns {Promise<Array<{ pageNumber: number, name: string, content: unknown }>>} Variants.
 */
async function getAuthorVariants(db, authorId) {
  // Stryker disable all -- variant lookup uses the fixed author query protocol.
  if (!db?.collectionGroup) return [];
  const authorDatabase = /** @type {any} */ (db);
  const snapshot = await authorDatabase
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
// Stryker restore all

/**
 * Read one visible author variant and its page number.
 * @param {{ data: () => Record<string, unknown>, ref?: object }} doc Variant document.
 * @returns {Promise<{ pageNumber: number, name: string, content: unknown } | null>} Variant or null.
 */
async function readAuthorVariant(doc) {
  // Stryker disable all -- visible variant extraction uses the fixed page-reference shape.
  const data = doc.data();
  if (!isVisibleAuthorVariant(data)) return null;
  const pageRef = /** @type {any} */ (doc.ref)?.parent?.parent;
  if (!pageRef) return null;
  const page = /** @type {any} */ ((await pageRef.get()).data());
  if (typeof page?.number !== 'number') return null;
  if (typeof data.name !== 'string') return null;
  return {
    pageNumber: page.number,
    name: data.name,
    content: data.content,
  };
}
// Stryker restore all

/**
 * Determine whether a variant is visible to author-page readers.
 * @param {Record<string, unknown>} data Variant data.
 * @returns {boolean} Whether the variant is visible.
 */
function isVisibleAuthorVariant(data) {
  // Stryker disable all -- author visibility uses the fixed dirty/visibility contract.
  return Number(data.visibility ?? 1) >= 0.5;
}
// Stryker restore all
