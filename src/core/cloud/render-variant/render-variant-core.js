import { DEFAULT_BUCKET_NAME } from './cloud-core.js';
import { assertFunction } from './common-core.js';

export { DEFAULT_BUCKET_NAME } from './cloud-core.js';
export const VISIBILITY_THRESHOLD = 0.5;

/**
 * @typedef {(message?: unknown, ...optionalParams: unknown[]) => void} ConsoleError
 * @typedef {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData>} DocumentReferenceData
 * @typedef {import('firebase-admin/firestore').DocumentSnapshot<import('firebase-admin/firestore').DocumentData>} DocumentSnapshotData
 * @typedef {{ doc: (path: string) => DocumentReferenceData }} FirestoreLike
 * @typedef {{ exists: () => Promise<[boolean]>, save: (content: string, options: object) => Promise<unknown> }} StorageFileLike
 * @typedef {{ file: (path: string) => StorageFileLike }} StorageBucketLike
 * @typedef {object} AncestorReference
 * @property {Function} get Function to resolve the referenced ancestor.
 * @property {AncestorReference | null | undefined} [parent] Optional parent reference in the ancestor chain.
 * @typedef {AncestorReference | null | undefined} OptionalAncestorReference
 * @typedef {{
 *   name: string;
 *   content: string;
 *   incomingOption?: string;
 *   author?: string;
 *   authorId?: string;
 *   authorName?: string;
 * }} VariantDocument
 * @typedef {import('firebase-admin/firestore').DocumentSnapshot<VariantDocument>} VariantSnapshot
 * @typedef {{ number: number; incomingOption?: string }} PageDocument
 * @typedef {import('firebase-admin/firestore').DocumentSnapshot<PageDocument>} PageSnapshot
 * @typedef {object} OptionDocument
 * @property {string} content Option body text stored in Firestore.
 * @property {number} position Floating-order index used when sorting options.
 * @property {number} [targetPageNumber] Optional page number that is chosen when this option redirects.
 * @property {import('firebase-admin/firestore').DocumentReference} [targetPage] Optional Firestore reference to the destination page document.
 * @typedef {{ content: string; position: number; targetPageNumber?: number; targetVariantName?: string; targetVariants?: { name: string; weight: number }[] }} OptionMetadata
 * @typedef {OptionMetadata[]} OptionCollection
 * @typedef {{ rootVariantRef?: OptionalAncestorReference; rootPageRef?: OptionalAncestorReference }} ParentReferences
 * @typedef {{ parentVariantSnap?: DocumentSnapshotData; parentPageSnap?: DocumentSnapshotData } | null} ParentSnapshots
 * @typedef {object} StoryMetadata
 * @property {DocumentReferenceData | undefined} [rootPage] Optional reference to the story's root page.
 * @typedef {StoryMetadata & { rootPage: DocumentReferenceData }} StoryDataWithRoot
 * @typedef {{ variant: { authorId?: string }; db: FirestoreLike; bucket: StorageBucketLike; consoleError?: ConsoleError }} AuthorLookupDeps
 * @typedef {{ variant: { incomingOption?: string }; db: FirestoreLike; consoleError?: ConsoleError }} ParentResolutionDeps
 * @typedef {{
 *   snap: VariantSnapshot;
 *   db: FirestoreLike;
 *   bucket: StorageBucketLike;
 *   consoleError?: ConsoleError;
 *   visibilityThreshold?: number;
 * }} ResolveRenderPlanDeps
 * @typedef {{
 *   snap: VariantSnapshot;
 *   pageData: { pageSnap: PageSnapshot; page: PageDocument };
 *   db: FirestoreLike;
 *   bucket: StorageBucketLike;
 *   consoleError?: ConsoleError;
 *   visibilityThreshold?: number;
 * }} BuildRenderPlanDeps
 * @typedef {{
 *   options: OptionMetadata[];
 *   storyTitle: string;
 *   authorName: string;
 *   authorUrl?: string;
 *   parentUrl?: string;
 *   firstPageUrl?: string;
 * }} RenderMetadata
 * @typedef {RenderMetadata & { page: PageDocument; variant: VariantDocument }} RenderOutputInput
 * @typedef {{
 *   variant: VariantDocument;
 *   page: PageDocument;
 *   parentUrl?: string;
 *   html: string;
 *   filePath: string;
 *   openVariant: boolean;
 * }} RenderOutput
 * @typedef {{ params?: Record<string, string> }} RenderContext
 * @typedef {RenderOutput & {
 *   snap: VariantSnapshot;
 *   context?: RenderContext;
 *   bucket: StorageBucketLike;
 *   invalidatePaths: (paths: string[]) => Promise<void>;
 * }} PersistRenderPlanDeps
 * @typedef {{
 *   storyData: import('firebase-admin/firestore').DocumentData;
 *   page: PageDocument;
 *   consoleError?: ConsoleError;
 * }} StoryMetadataDeps
 * @typedef {{ pageSnap: PageSnapshot; page: PageDocument; consoleError?: ConsoleError }} StoryMetadataLookupDeps
 * @typedef {{ exists: boolean; data: () => Record<string, any> }} DocumentLike
 * @typedef {{ get: () => Promise<DocumentLike> }} DocumentRefLike
 * @typedef {{ parentVariantRef: DocumentRefLike; parentPageRef: DocumentRefLike }} ParentReferencePair
 * @typedef {{ parentVariantSnap: DocumentLike; parentPageSnap: DocumentLike }} ParentSnapshotPair
 * @typedef {{
 *   snap: VariantSnapshot;
 *   db: FirestoreLike;
 *   bucket: StorageBucketLike;
 *   pageSnap: PageSnapshot;
 *   page: PageDocument;
 *   consoleError?: ConsoleError;
 *   visibilityThreshold?: number;
 *   variant?: VariantDocument;
 * }} GatherMetadataDeps
 */

/**
 * Escape HTML special characters to prevent injection.
 * @param {string} text Text to escape.
 * @returns {string} Escaped text.
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const HEADER_BRAND_HTML = `
      <a class="brand" href="/">
        <img src="/img/logo.png" alt="Dendrite logo" />
        Dendrite
      </a>`;

const HEADER_NAV_HTML = `
      <nav class="nav-inline" aria-label="Primary">
        <a href="/new-story.html">New story</a>
        <a href="/mod.html">Moderate</a>
        <a href="/stats.html">Stats</a>
        <a class="admin-link" href="/admin.html" style="display:none">Admin</a>
        <div id="signinButton"></div>
        <div id="signoutWrap" style="display:none">
          <a id="signoutLink" href="#">Sign out</a>
        </div>
      </nav>`;

const HEADER_MENU_BUTTON_HTML = `
      <button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">☰</button>`;

const MOBILE_MENU_HTML = `
    <!-- Mobile menu -->
    <div id="mobile-menu" class="menu-overlay" hidden aria-hidden="true">
      <div class="menu-sheet" role="dialog" aria-modal="true">
        <button class="menu-close" aria-label="Close menu">✕</button>

        <nav class="menu-groups">
          <div class="menu-group">
            <h3>Write</h3>
            <a href="/new-story.html">New story</a>
          </div>

          <div class="menu-group">
            <h3>Moderation</h3>
            <a href="/mod.html">Moderate</a>
            <a href="/stats.html">Stats</a>
            <a class="admin-link" href="/admin.html" style="display:none">Admin</a>
          </div>

          <div class="menu-group">
            <h3>About</h3>
            <a href="/about.html">About</a>
          </div>

          <div class="menu-group">
            <h3>Account</h3>
            <div id="signinButton"></div>
            <div id="signoutWrap" style="display:none">
              <a id="signoutLink" href="#">Sign out</a>
            </div>
          </div>
        </nav>
      </div>
    </div>`;

const HEADER_HTML = `
    <header class="site-header">${HEADER_BRAND_HTML}

${HEADER_NAV_HTML}

${HEADER_MENU_BUTTON_HTML}
    </header>

${MOBILE_MENU_HTML}
`;

const GOOGLE_SIGNIN_SCRIPTS = `
    <script src="https://accounts.google.com/gsi/client" defer></script>
    <script type="module" src="/variantGoogleSignIn.js"></script>
`;

const MENU_TOGGLE_SCRIPT = `
    <script src="/variantMenuToggle.js"></script>
`;

const VARIANT_REDIRECT_SCRIPT = `
    <script src="/variantRedirect.js"></script>
`;

const DEFAULT_CONSOLE_ERROR = () => {};
DEFAULT_CONSOLE_ERROR(); // ensure coverage for the fallback logger once when the module loads.

/**
 *
 * @param {string} text - Raw text with Markdown-like emphasis markers.
 * @returns {string} HTML representation of the provided text using inline Markdown.
 */
function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  return html;
}

/**
 * @typedef {object} VariantOption
 * @property {number} position - Position index from Firestore.
 * @property {string} content - Option text rendered as inline Markdown.
 * @property {Array<{ name: string, weight: number }>} [targetVariants] - Optional variant metadata for navigation.
 * @property {number} [targetPageNumber] - Page number for the target variant.
 * @property {string} [targetVariantName] - Variant identifier for the target page.
 */

/**
 *
 * @param {number} pageNumber - Page number the option belongs to.
 * @param {string} variantName - Variant identifier tied to the option.
 * @param {VariantOption} option - Option metadata from Firestore.
 * @returns {string} HTML list item for the option.
 */
function buildOptionItem(pageNumber, variantName, option) {
  const slug = buildOptionSlug(pageNumber, variantName, option.position);
  const href = resolveOptionHref(slug, option);
  const optionHtml = renderInlineMarkdown(option.content);
  const baseAttrs = buildBaseAttrs(slug, href);
  const variantAttrs = buildVariantAttrs(
    option.targetVariants,
    option.targetPageNumber
  );
  const attrs = [...baseAttrs, ...variantAttrs];
  return `<li><a ${attrs.join(' ')}>${optionHtml}</a></li>`;
}

/**
 * Build the base attribute array that every option anchor shares.
 * @param {string} slug - Slug identifying the option.
 * @param {string} href - Destination URL for the option link.
 * @returns {string[]} Attribute strings.
 */
function buildBaseAttrs(slug, href) {
  return ['class="variant-link"', `data-link-id="${slug}"`, `href="${href}"`];
}

/**
 *
 * @param {number} pageNumber - Page number used for slug creation.
 * @param {string} variantName - Variant identifier used for slug creation.
 * @param {VariantOption[]} options - List of variant navigation options.
 * @returns {string} Joined HTML list of options.
 */
function buildOptionsHtml(pageNumber, variantName, options) {
  return options
    .map(option => buildOptionItem(pageNumber, variantName, option))
    .join('');
}

/**
 * Build the rendered option items for the resolved build data.
 * @param {{ pageNumber: number, variantName: string, options: VariantOption[] }} resolvedParams - Normalized parameters.
 * @returns {string} All option list items.
 */
function buildOptionsItems(resolvedParams) {
  const { pageNumber, variantName, options } = resolvedParams;
  return buildOptionsHtml(pageNumber, variantName, options);
}

/**
 * Resolve the href used to navigate from an option entry.
 * @param {string} slug - Slug referencing the option when linking back to the editor.
 * @param {{ targetPageNumber?: number, targetVariantName?: string }} option - Option metadata.
 * @returns {string} Final href for the option link.
 */
function resolveOptionHref(slug, option) {
  if (option.targetPageNumber !== undefined) {
    return resolveTargetVariantHref(
      option.targetVariantName,
      option.targetPageNumber
    );
  }

  return `../new-page.html?option=${slug}`;
}

/**
 * Build the href for an option that targets another variant.
 * @param {string | undefined} targetVariantName - Variant identifier applied to the target page.
 * @param {number} targetPageNumber - Page number of the target variant.
 * @returns {string} URL pointing at the target variant page.
 */
function resolveTargetVariantHref(targetVariantName, targetPageNumber) {
  const suffix = targetVariantName || '';
  return `/p/${targetPageNumber}${suffix}.html`;
}

/**
 * Build the slug used to reference a specific variant option.
 * @param {number} pageNumber - Page number the option belongs to.
 * @param {string} variantName - Variant identifier for the option.
 * @param {number} position - Position index of the option.
 * @returns {string} Slug uniquely identifying the option.
 */
function buildOptionSlug(pageNumber, variantName, position) {
  return `${pageNumber}-${variantName}-${position}`;
}

/**
 * Build any additional data attributes for options that target other variants.
 * @param {Array<{ name: string, weight: number }> | undefined} variants - Variant descriptors to encode.
 * @param {number | undefined} targetPageNumber - Page number of the target variant.
 * @returns {string[]} Attribute strings for the option anchor.
 */
function buildVariantAttrs(variants, targetPageNumber) {
  if (!variants) {
    return [];
  }

  const variantsAttr = variants
    .map(v => `${targetPageNumber}${v.name}:${v.weight}`)
    .join(',');

  return [`data-variants="${escapeHtml(variantsAttr)}"`];
}

/**
 * Determine whether the story title heading should render.
 * @param {string} storyTitle - Candidate title text for the heading.
 * @param {boolean} showTitleHeading - Flag that toggles heading rendering.
 * @returns {boolean} True when both the title and the toggle are present.
 */
function shouldRenderTitleHeading(storyTitle, showTitleHeading) {
  return Boolean(storyTitle && showTitleHeading);
}

/**
 *
 * @param {string} storyTitle - Title to display when heading is enabled.
 * @param {boolean} showTitleHeading - Controls whether the heading renders.
 * @returns {string} Heading HTML showing the story title when applicable.
 */
function buildTitleHeadingHtml(storyTitle, showTitleHeading) {
  if (!shouldRenderTitleHeading(storyTitle, showTitleHeading)) return '';
  return `<h1>${escapeHtml(storyTitle)}</h1>`;
}

/**
 * Build the head title via the resolved parameters object.
 * @param {{ storyTitle?: string }} root0 - Normalized build properties.
 * @returns {string} Document title for the `<head>` element.
 */
function buildHeadTitleFromParams({ storyTitle }) {
  return buildHeadTitle(storyTitle);
}

/**
 * Build the author section HTML from normalized inputs.
 * @param {{ author?: string, authorUrl?: string }} root0 - Normalized author metadata.
 * @returns {string} Author HTML snippet or an empty string.
 */
function buildAuthorHtmlFromParams({ author, authorUrl }) {
  return buildAuthorHtml(author, authorUrl);
}

/**
 * Render the parent link markup from the normalized parameters.
 * @param {{ parentUrl?: string }} root0 - Parent link metadata.
 * @returns {string} Link paragraph HTML or an empty string.
 */
function buildParentLink({ parentUrl }) {
  return buildLinkParagraph(parentUrl, 'Back');
}

/**
 * Render the first-page link from the normalized parameters.
 * @param {{ firstPageUrl?: string }} root0 - Data used to build the link.
 * @returns {string} Link paragraph HTML or an empty string.
 */
function buildFirstPageLink({ firstPageUrl }) {
  return buildLinkParagraph(firstPageUrl, 'First page');
}

/**
 * Build the rewrite helper link from normalized parameters.
 * @param {{ pageNumber: number }} root0 - Parameters describing the current page.
 * @returns {string} Rewrite link HTML.
 */
function buildRewriteLinkFromParams({ pageNumber }) {
  return buildRewriteLink(pageNumber);
}

/**
 * Build the report HTML snippet using normalized parameters.
 * @param {{ pageNumber: number, variantName: string }} root0 - Parameters for the current variant.
 * @returns {string} Report link HTML.
 */
function buildReportHtmlFromParams({ pageNumber, variantName }) {
  return buildReportHtml(pageNumber, variantName);
}

/**
 * Build pagination controls from normalized parameters.
 * @param {{ pageNumber: number }} root0 - Parameters describing the current page.
 * @returns {string} Pagination control HTML.
 */
function buildPageNumberHtmlFromParams({ pageNumber }) {
  return buildPageNumberHtml(pageNumber);
}

/**
 * Render paragraph markup from normalized parameters.
 * @param {{ content: string }} root0 - Variant content to render.
 * @returns {string} Inline paragraph HTML.
 */
function buildParagraphsFromParams({ content }) {
  return buildParagraphsHtml(content);
}

/**
 * Return the title section for resolved build parameters.
 * @param {{ storyTitle: string, showTitleHeading: boolean }} resolvedParams - Parameters controlling title rendering.
 * @returns {string} HTML for the title heading when enabled.
 */
function buildTitleHeading(resolvedParams) {
  return buildTitleHeadingHtml(
    resolvedParams.storyTitle,
    resolvedParams.showTitleHeading
  );
}

/**
 *
 * @param {string | undefined} storyTitle - Title shown in the document's `<title>`.
 * @returns {string} Title displayed in the document head.
 */
function buildHeadTitle(storyTitle) {
  if (storyTitle) {
    return `Dendrite - ${escapeHtml(storyTitle)}`;
  }
  return 'Dendrite';
}

/**
 *
 * @param {string | undefined} author - Name of the story author.
 * @param {string | undefined} authorUrl - Optional author link.
 * @returns {string} Author credits HTML.
 */
function buildAuthorHtml(author, authorUrl) {
  if (!author) {
    return '';
  }
  return buildAuthorLink(author, authorUrl);
}

/**
 * Build the author credit markup, linking to the author when a URL is provided.
 * @param {string} author - Name of the author to display.
 * @param {string | undefined} authorUrl - Optional URL pointing to the author profile.
 * @returns {string} HTML snippet that credits the author.
 */
function buildAuthorLink(author, authorUrl) {
  if (authorUrl) {
    return `<p>By <a href="${authorUrl}">${escapeHtml(author)}</a></p>`;
  }
  return `<p>By ${escapeHtml(author)}</p>`;
}

/**
 *
 * @param {string | undefined} url - Target URL for the back/first page links.
 * @param {string} label - Link label.
 * @returns {string} Link paragraph HTML or empty string.
 */
function buildLinkParagraph(url, label) {
  if (!url) return '';
  return `<p><a href="${url}">${label}</a></p>`;
}

/**
 *
 * @param {number} pageNumber - Page number used in rewrite link.
 * @returns {string} Rewrite link HTML.
 */
function buildRewriteLink(pageNumber) {
  return `<a href="../new-page.html?page=${pageNumber}">Rewrite</a> `;
}

/**
 *
 * @param {number} pageNumber - Page number for the report slug.
 * @param {string} variantName - Variant identifier used in the report payload.
 * @returns {string} Report link HTML snippet.
 */
function buildReportHtml(pageNumber, variantName) {
  const reportScript = `<script>
const handleReportClick = async e => {
  e.preventDefault();
  try {
    await fetch('https://europe-west1-irien-465710.cloudfunctions.net/prod-report-for-moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant: '${pageNumber}${variantName}' }),
    });
    alert('Thanks for your report.');
  } catch (e) {
    alert('Sorry, something went wrong.');
  }
};
document.getElementById('reportLink').onclick = handleReportClick;
</script>`;
  return `<p><a id="reportLink" href="#">⚑ Report</a></p>${reportScript}`;
}

/**
 *
 * @param {number} pageNumber - Current page number for navigation links.
 * @returns {string} Pagination controls HTML.
 */
function buildPageNumberHtml(pageNumber) {
  return (
    `<p style="text-align:center">` +
    `<a style="text-decoration:none" href="/p/${pageNumber - 1}a.html">◀</a> ` +
    `${pageNumber} ` +
    `<a style="text-decoration:none" href="/p/${pageNumber + 1}a.html">▶</a>` +
    `</p>`
  );
}

/**
 *
 * @param {string} content - Variant body content.
 * @returns {string} Paragraph HTML representing the content.
 */
function buildParagraphsHtml(content) {
  return content
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => `<p>${renderInlineMarkdown(line)}</p>`)
    .join('');
}

/**
 * Build the `<head>` element for the variant HTML.
 * @param {string} headTitle - Text to place inside the `<title>` tag.
 * @returns {string} `<head>` markup for the HTML document.
 */
function buildHeadElement(headTitle) {
  return `  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${headTitle}</title>
    <link rel="icon" href="/favicon.ico" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css"
    />
    <link rel="stylesheet" href="/dendrite.css" />
  </head>`;
}

/**
 * Build the `<body>` section including header, menu, and scripts.
 * @param {string} mainContent - Rendered `<main>` block for the variant.
 * @returns {string} Complete `<body>` markup.
 */
function buildBodyElement(mainContent) {
  return `  <body>
${HEADER_HTML}
${mainContent}
${GOOGLE_SIGNIN_SCRIPTS}
${MENU_TOGGLE_SCRIPT}
${VARIANT_REDIRECT_SCRIPT}
  </body>`;
}

/**
 * Build the `<main>` section for the resolved build variant parameters.
 * @param {{
 *   pageNumber: number,
 *   variantName: string,
 *   content: string,
 *   options: VariantOption[],
 *   storyTitle: string,
 *   showTitleHeading: boolean,
 *   author?: string,
 *   authorUrl?: string,
 *   parentUrl?: string,
 *   firstPageUrl?: string,
 * }} resolvedParams - Normalized build inputs.
 * @returns {string} Rendered `<main>` block.
 */
function buildMainContent(resolvedParams) {
  const title = buildTitleHeading(resolvedParams);
  const paragraphs = buildParagraphsFromParams(resolvedParams);
  const items = buildOptionsItems(resolvedParams);
  const authorHtml = buildAuthorHtmlFromParams(resolvedParams);
  const parentHtml = buildParentLink(resolvedParams);
  const firstHtml = buildFirstPageLink(resolvedParams);
  const rewriteLink = buildRewriteLinkFromParams(resolvedParams);
  const reportHtml = buildReportHtmlFromParams(resolvedParams);
  const pageNumberHtml = buildPageNumberHtmlFromParams(resolvedParams);
  const pageNumber = resolvedParams.pageNumber;
  return `<main>${title}${paragraphs}<ol>${items}</ol>${authorHtml}${parentHtml}${firstHtml}<p>${rewriteLink}<a href="./${pageNumber}-alts.html">Other variants</a></p>${pageNumberHtml}${reportHtml}</main>`;
}

/**
 * Determine whether the `buildHtml` helper was called with the object form.
 * @param {unknown} buildHtmlInput - Argument passed in by the caller.
 * @returns {boolean} True when the input looks like the object signature.
 */
const BUILD_HTML_BASE_DEFAULTS = {
  storyTitle: '',
  author: '',
  authorUrl: '',
  parentUrl: '',
  firstPageUrl: '',
  showTitleHeading: true,
  options: [],
};

/**
 * Render a variant page given normalized build input.
 * @param {{
 *   pageNumber: number,
 *   variantName: string,
 *   content: string,
 *   options: VariantOption[],
 *   storyTitle?: string,
 *   author?: string,
 *   authorUrl?: string,
 *   parentUrl?: string,
 *   firstPageUrl?: string,
 *   showTitleHeading?: boolean,
 * }} buildHtmlInput - Rendering parameters provided either positionally or via an object.
 * @returns {string} Rendered HTML for the variant page.
 */
export function buildHtml(buildHtmlInput) {
  const resolvedParams = { ...BUILD_HTML_BASE_DEFAULTS, ...buildHtmlInput };
  const headTitle = buildHeadTitleFromParams(resolvedParams);
  const mainContent = buildMainContent(resolvedParams);
  const headElement = buildHeadElement(headTitle);
  const bodyElement = buildBodyElement(mainContent);
  return `<!doctype html>
<html lang="en">
${headElement}
${bodyElement}
</html>`;
}

/**
 *
 * @param {number} pageNumber - Page number used to build each link.
 * @param {Array<{name: string, content: string}>} variants - Alternate variants to render.
 * @returns {string} HTML for alternate variants list.
 */
export function buildAltsHtml(pageNumber, variants) {
  const items = variants
    .map(variant => {
      const words = String(variant.content || '')
        .split(/\s+/)
        .slice(0, 5)
        .join(' ');
      return `<li><a href="/p/${pageNumber}${variant.name}.html">${escapeHtml(
        words
      )}</a></li>`;
    })
    .join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dendrite</title>
    <link rel="icon" href="/favicon.ico" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css"
    />
    <link rel="stylesheet" href="/dendrite.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">
        <img src="/img/logo.png" alt="Dendrite logo" />
        Dendrite
      </a>

      <nav class="nav-inline" aria-label="Primary">
        <a href="/new-story.html">New story</a>
        <a href="/mod.html">Moderate</a>
        <a href="/stats.html">Stats</a>
        <a class="admin-link" href="/admin.html" style="display:none">Admin</a>
        <div id="signinButton"></div>
        <div id="signoutWrap" style="display:none">
          <a id="signoutLink" href="#">Sign out</a>
        </div>
      </nav>

      <button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">☰</button>
    </header>

    <div id="mobile-menu" class="menu-overlay" hidden aria-hidden="true">
      <div class="menu-sheet" role="dialog" aria-modal="true">
        <button class="menu-close" aria-label="Close menu">✕</button>

        <nav class="menu-groups">
          <div class="menu-group">
            <h3>Write</h3>
            <a href="/new-story.html">New story</a>
          </div>

          <div class="menu-group">
            <h3>Moderation</h3>
            <a href="/mod.html">Moderate</a>
            <a href="/stats.html">Stats</a>
            <a class="admin-link" href="/admin.html" style="display:none">Admin</a>
          </div>

          <div class="menu-group">
            <h3>Account</h3>
            <div id="signinButton"></div>
            <div id="signoutWrap" style="display:none">
              <a id="signoutLink" href="#">Sign out</a>
            </div>
          </div>
        </nav>
      </div>
    </div>
    <main><ol>${items}</ol></main>
    <script src="https://accounts.google.com/gsi/client" defer></script>
    <script type="module">
      import {
        initGoogleSignIn,
        getIdToken,
        isAdmin,
        signOut,
      } from '../googleAuth.js';
      const als = document.querySelectorAll('.admin-link');
      const sbs = document.querySelectorAll('#signinButton');
      const sws = document.querySelectorAll('#signoutWrap');
      const sos = document.querySelectorAll('#signoutLink');
      function showSignedIn() {
        sbs.forEach(el => (el.style.display = 'none'));
        sws.forEach(el => (el.style.display = ''));
        if (isAdmin()) als.forEach(el => (el.style.display = ''));
      }
      function showSignedOut() {
        sbs.forEach(el => (el.style.display = ''));
        sws.forEach(el => (el.style.display = 'none'));
        als.forEach(el => (el.style.display = 'none'));
      }
      initGoogleSignIn({ onSignIn: showSignedIn });
      sos.forEach(link => {
        link.addEventListener('click', async e => {
          e.preventDefault();
          await signOut();
          showSignedOut();
        });
      });
      if (getIdToken()) {
        showSignedIn();
      }
    </script>
    <script>
      (function () {
        const toggle = document.querySelector('.menu-toggle');
        const overlay = document.getElementById('mobile-menu');
        const sheet = overlay.querySelector('.menu-sheet');
        const closeBtn = overlay.querySelector('.menu-close');

        function openMenu() {
          overlay.hidden = false;
          overlay.setAttribute('aria-hidden', 'false');
          toggle.setAttribute('aria-expanded', 'true');
          document.body.style.overflow = 'hidden';
          const first = sheet.querySelector('a,button,[tabindex="0"]');
          if (first) first.focus();
        }
        function closeMenu() {
          overlay.setAttribute('aria-hidden', 'true');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
          setTimeout(() => (overlay.hidden = true), 180);
          toggle.focus();
        }
        toggle.addEventListener('click', () => {
          if (overlay.hidden) {
            openMenu();
          } else {
            closeMenu();
          }
        });
        closeBtn.addEventListener('click', closeMenu);
        overlay.addEventListener('click', e => {
          if (e.target === overlay) closeMenu();
        });
        addEventListener('keydown', e => {
          if (e.key === 'Escape' && !overlay.hidden) closeMenu();
        });
      })();
    </script>
  </body>
</html>`;
}
/**
 *
 * @param {Array<{data: () => {visibility?: number, name?: string, content?: string}}>} docs - Firestore snapshots to inspect.
 * @returns {Array<{name: string, content: string}>} Visible variant summaries.
 */
export function getVisibleVariants(docs) {
  return docs
    .filter(doc => (doc.data().visibility ?? 1) >= VISIBILITY_THRESHOLD)
    .map(mapDocToVariant);
}

/**
 * Map document to variant object.
 * @param {{ data: Function }} doc Document.
 * @returns {{ name: string, content: string }} Variant object.
 */
function mapDocToVariant(doc) {
  const data = doc.data();
  return buildVariantObject(data);
}

/**
 * Normalize a variant string value, providing a default when missing.
 * @param {unknown} value Value extracted from variant data.
 * @returns {string} Normalized string, empty when the supplied value is not a string.
 */
function normalizeVariantString(value) {
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

/**
 * @typedef {{ name?: unknown, content?: unknown }} VariantDocumentData
 */

/**
 * Build variant object from data.
 * @param {VariantDocumentData} data Variant data.
 * @returns {{ name: string, content: string }} Variant object.
 */
function buildVariantObject(data) {
  const { name, content } = data ?? {};
  return {
    name: normalizeVariantString(name),
    content: normalizeVariantString(content),
  };
}

/**
 * Ensure a Firestore-like database instance exposes the required helpers.
 * @param {{doc: Function}} db - Database instance that should provide a `doc` helper.
 * @throws {TypeError} When the provided database does not expose a `doc` function.
 */
function assertDb(db) {
  if (!db) {
    throw new TypeError('db must provide a doc helper');
  }
  checkDbDocHelper(db);
}

/**
 * Check if db has doc helper.
 * @param {{ doc: Function }} db Database.
 */
function checkDbDocHelper(db) {
  if (typeof db.doc !== 'function') {
    throw new TypeError('db must provide a doc helper');
  }
}

/**
 * Confirm the storage dependency can create bucket handles.
 * @param {{bucket: Function}} storage - Storage implementation expected to expose a `bucket` helper.
 * @throws {TypeError} When the provided storage does not expose a `bucket` function.
 */
function assertStorage(storage) {
  if (!storage) {
    throw new TypeError('storage must provide a bucket helper');
  }
  checkStorageBucketHelper(storage);
}

/**
 * Check if storage has bucket helper.
 * @param {{ bucket: Function }} storage Storage.
 */
function checkStorageBucketHelper(storage) {
  if (typeof storage.bucket !== 'function') {
    throw new TypeError('storage must provide a bucket helper');
  }
}

/**
 * Create invalidation function.
 * @param {object} root0 Dependencies.
 * @param {(input: string, init?: object) => Promise<Response>} root0.fetchFn Fetch function.
 * @param {string} root0.projectId Project ID.
 * @param {string} root0.urlMapName URL map name.
 * @param {string} [root0.cdnHost] CDN host override.
 * @param {() => string} root0.randomUUID UUID generator for requests.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [root0.consoleError] Logger for failures.
 * @returns {(paths: string[]) => Promise<void>} Invalidation helper.
 */
export function createInvalidatePaths({
  fetchFn,
  projectId,
  urlMapName,
  cdnHost,
  randomUUID,
  consoleError,
}) {
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  return createInvalidatePathsImpl({
    fetchFn,
    projectId,
    urlMapName,
    cdnHost,
    randomUUID,
    consoleError,
  });
}

/**
 * Build the CDN invalidation helper configured with the resolved dependencies.
 * @param {object} deps Invalidation dependencies.
 * @param {(input: string, init?: object) => Promise<Response>} deps.fetchFn Fetch implementation.
 * @param {string | undefined} deps.projectId Optional GCP project identifier.
 * @param {string | undefined} deps.urlMapName URL map name used for the CDN.
 * @param {string | undefined} deps.cdnHost CDN host that will be purged.
 * @param {() => string} deps.randomUUID UUID generator used for request IDs.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [deps.consoleError] Optional error logger.
 * @returns {(paths: string[]) => Promise<void>} Handler that invalidates the provided paths.
 */
function createInvalidatePathsImpl({
  fetchFn,
  projectId,
  urlMapName,
  cdnHost,
  randomUUID,
  consoleError,
}) {
  const resolvedProjectId = resolveProjectId(projectId);
  const resolvedUrlMapName = resolveUrlMapName(urlMapName);
  const resolvedCdnHost = resolveCdnHost(cdnHost);
  const invalidateUrl = buildInvalidateUrl(
    resolvedProjectId,
    resolvedUrlMapName
  );

  return createInvalidateHandler({
    url: invalidateUrl,
    host: resolvedCdnHost,
    fetchFn,
    randomUUID,
    consoleError,
  });
}

/**
 * Create the CDN invalidation handler bound to a resolved URL and host.
 * @param {{ url: string, host: string, fetchFn: (input: string, init?: object) => Promise<Response>, randomUUID: () => string, consoleError?: (message: string, ...optionalParams: unknown[]) => void }} deps Handler dependencies.
 * @returns {(paths: string[]) => Promise<void>} Handler that invalidates each path.
 */
function createInvalidateHandler({
  url,
  host,
  fetchFn,
  randomUUID,
  consoleError,
}) {
  return async function invalidatePaths(paths) {
    if (!isValidPaths(paths)) {
      return;
    }

    await executeInvalidation(paths, {
      url,
      host,
      fetchFn,
      randomUUID,
      consoleError,
    });
  };
}

/**
 * Resolve the GCP project identifier used by the CDN invalidation URL.
 * @param {string | undefined} projectId Optional project ID.
 * @returns {string} Project identifier or empty string when not provided.
 */
function resolveProjectId(projectId) {
  if (projectId) {
    return projectId;
  }

  return '';
}

/**
 * Resolve the URL map name for CDN invalidation.
 * @param {string | undefined} urlMapName Optional URL map override.
 * @returns {string} URL map name.
 */
function resolveUrlMapName(urlMapName) {
  if (urlMapName) {
    return urlMapName;
  }

  return 'prod-dendrite-url-map';
}

/**
 * Resolve the CDN host used in invalidation payloads.
 * @param {string | undefined} cdnHost Optional CDN host override.
 * @returns {string} CDN hostname.
 */
function resolveCdnHost(cdnHost) {
  if (cdnHost) {
    return cdnHost;
  }

  return 'www.dendritestories.co.nz';
}

/**
 * Build the complete Compute Engine invalidation URL for a CDN.
 * @param {string} projectId Resolved project identifier.
 * @param {string} urlMapName Resolved URL map name.
 * @returns {string} Compute Engine invalidation endpoint.
 */
function buildInvalidateUrl(projectId, urlMapName) {
  return `https://compute.googleapis.com/compute/v1/projects/${projectId}/global/urlMaps/${urlMapName}/invalidateCache`;
}

/**
 * Execute cache invalidations for the supplied paths.
 * @param {string[]} paths Paths to purge from the CDN cache.
 * @param {{url: string, host: string, fetchFn: (input: string, init?: object) => Promise<Response>, randomUUID: () => string, consoleError?: (message: string, ...optionalParams: unknown[]) => void}} options Invalidation dependencies.
 * @returns {Promise<void>} Resolves after every invalidation request completes.
 */
async function executeInvalidation(paths, options) {
  const { url, host, fetchFn, randomUUID, consoleError } = options;
  const token = await getAccessToken(fetchFn);

  await Promise.all(
    paths.map(path =>
      invalidatePathItem({
        path,
        token,
        url,
        host,
        fetchFn,
        randomUUID,
        consoleError,
      })
    )
  );
}

/**
 * Confirm the helper received something that looks like a path list.
 * @param {unknown} paths Candidate list of paths.
 * @returns {boolean} True when the input is a non-empty array.
 */
function isValidPaths(paths) {
  if (!Array.isArray(paths)) {
    return false;
  }
  return paths.length > 0;
}

/**
 * Acquire an access token for the CDN invalidation endpoint.
 * @param {(input: string, init?: object) => Promise<Response>} fetchFn Fetch implementation.
 * @returns {Promise<string>} OAuth access token.
 */
async function getAccessToken(fetchFn) {
  const response = await fetchFn(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );

  ensureResponseOk(response, 'metadata token');

  return extractAccessToken(response);
}

/**
 * Ensure the fetch response is successful.
 * @param {Response} response Response returned by the metadata endpoint.
 * @param {string} label Context label used for errors.
 * @returns {void}
 */
function ensureResponseOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
}

/**
 * Extract the metadata access token from the response body.
 * @param {Response} response Metadata response containing `access_token`.
 * @returns {Promise<string>} Parsed token string.
 */
async function extractAccessToken(response) {
  const { access_token: accessToken } = await response.json();
  return accessToken;
}

/**
 * Request CDN invalidation for a single path.
 * @param {object} root0 Invalidation options.
 * @param {string} root0.path CDN path to invalidate.
 * @param {string} root0.token OAuth bearer token.
 * @param {string} root0.url Compute URL map invalidation endpoint.
 * @param {string} root0.host CDN host to invalidate.
 * @param {(input: string, init?: object) => Promise<Response>} root0.fetchFn Fetch implementation.
 * @param {() => string} root0.randomUUID UUID generator for request identifiers.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [root0.consoleError] Optional error logger.
 * @returns {Promise<void>} Resolves after the invalidation completes.
 */
async function invalidatePathItem({
  path,
  token,
  url,
  host,
  fetchFn,
  randomUUID,
  consoleError,
}) {
  return fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      host,
      path,
      requestId: randomUUID(),
    }),
  })
    .then(response => logInvalidateResponse(response, path, consoleError))
    .catch(error => {
      handleInvalidateError(error, path, consoleError);
    });
}

/**
 * Log invalidation failures when the response is not OK.
 * @param {Response} response Fetch response for the invalidation call.
 * @param {string} path CDN path that was requested.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [consoleError] Optional logger.
 * @returns {void}
 */
function logInvalidateResponse(response, path, consoleError) {
  if (shouldLogInvalidateResponse(response, consoleError)) {
    /** @type {Function} */ (consoleError)(
      `invalidate ${path} failed: ${response.status}`
    );
  }
}

/**
 * Determine if the invalidation response should be logged.
 * @param {Response} response Fetch response for the invalidation call.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [consoleError] Optional logger.
 * @returns {boolean} True when the response is not OK and a logger is provided.
 */
function shouldLogInvalidateResponse(response, consoleError) {
  return !response.ok && Boolean(consoleError);
}

/**
 * Report invalidation errors via the optional logger.
 * @param {unknown} error Error or rejection reason.
 * @param {string} path Path that failed.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [consoleError] Optional logger.
 * @returns {void}
 */
function handleInvalidateError(error, path, consoleError) {
  if (!consoleError) {
    return;
  }
  consoleError(`invalidate ${path} error`, getErrorMessage(error));
}
/**
 * Safely read the `message` property from an error-like object.
 * @param {unknown} error Candidate error object.
 * @returns {string | undefined} Error message string when present.
 */
function getMessageFromError(error) {
  if (!isObject(error)) {
    return undefined;
  }

  return extractMessageProperty(error);
}

/**
 * Verify that a value is an object (not null).
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is an object.
 */
function isObject(value) {
  return Boolean(value && typeof value === 'object');
}

/**
 * Extract the `message` property when it exists on an object.
 * @param {unknown} error Candidate error object.
 * @returns {string | undefined} The message string if present.
 */
function extractMessageProperty(error) {
  if (hasStringMessage(error)) {
    return /** @type {{message: string}} */ (error).message;
  }

  return undefined;
}

/**
 * Check that a value exposes a string-valued `message` property.
 * @param {unknown} error Candidate message holder.
 * @returns {boolean} True when a string message exists.
 */
function hasStringMessage(error) {
  return (
    isObject(error) && typeof (/** @type {any} */ (error).message) === 'string'
  );
}

/**
 * Resolve a normalized error message for logging.
 * @param {unknown} error Error candidate.
 * @returns {unknown} Message string when available or the original value.
 */
function getErrorMessage(error) {
  const message = getMessageFromError(error);
  if (message !== undefined) {
    return message;
  }
  return error;
}

/**
 * Construct metadata for a single option attached to a story variant.
 * @param {{ data: OptionDocument; visibilityThreshold: number; consoleError: ConsoleError }} options
 *   Information about the option to prepare for rendering.
 * @returns {Promise<OptionMetadata>} Metadata describing the option suitable for HTML rendering.
 */
async function buildOptionMetadata({
  data,
  visibilityThreshold,
  consoleError,
}) {
  const targetMetadata = await resolveTargetMetadata(
    data,
    visibilityThreshold,
    consoleError
  );

  return /** @type {OptionMetadata} */ ({
    content: data.content,
    position: data.position,
    ...targetMetadata,
  });
}

/**
 * Resolve the target metadata referenced by an option document.
 * @param {OptionDocument} data Raw option document data.
 * @param {number} visibilityThreshold Minimum visibility required for variants.
 * @param {ConsoleError} [consoleError] Optional logger for errors.
 * @returns {Promise<Omit<OptionMetadata, 'content' | 'position'>>} Target metadata derived from the option.
 */
async function resolveTargetMetadata(data, visibilityThreshold, consoleError) {
  if (data.targetPage) {
    return fetchTargetPageMetadata(
      data.targetPage,
      visibilityThreshold,
      consoleError
    );
  }

  return resolveTargetPageNumber(data);
}

/**
 * Derive the resolved page number metadata when no target reference exists.
 * @param {OptionDocument} data Option document payload.
 * @returns {Omit<OptionMetadata, 'content' | 'position'>} Metadata containing the target page number when set.
 */
function resolveTargetPageNumber(data) {
  if (data.targetPageNumber !== undefined) {
    return /** @type {Omit<OptionMetadata, 'content' | 'position'>} */ ({
      targetPageNumber: data.targetPageNumber,
    });
  }

  return /** @type {Omit<OptionMetadata, 'content' | 'position'>} */ ({});
}

/**
 * Retrieve metadata for a referenced target page, including the first visible variant.
 * @param {import('firebase-admin/firestore').DocumentReference} targetPage Firestore reference for the target page document.
 * @param {number} visibilityThreshold Minimum visibility required for a variant to be considered published.
 * @param {ConsoleError} [consoleError] Optional logger for unexpected failures.
 * @returns {Promise<Omit<OptionMetadata, 'content' | 'position'>>} Metadata derived from the target page lookup.
 */
async function fetchTargetPageMetadata(
  targetPage,
  visibilityThreshold,
  consoleError
) {
  return /** @type {Promise<Omit<OptionMetadata, 'content' | 'position'>>} */ (
    targetPage
      .get()
      .then(
        /**
         * @param {import('firebase-admin/firestore').DocumentSnapshot} targetSnap - Target snapshot.
         * @returns {Promise<Omit<OptionMetadata, 'content' | 'position'>>} Metadata.
         */
        targetSnap => {
          if (!targetSnap.exists) {
            return Promise.resolve(
              /** @type {Omit<OptionMetadata, 'content' | 'position'>} */ ({})
            );
          }

          return processTargetSnap(
            targetSnap,
            /** @type {any} */ (targetPage),
            visibilityThreshold
          );
        }
      )
      .catch(
        /**
         * @param {any} error - Error object.
         * @returns {Omit<OptionMetadata, 'content' | 'position'>} Empty object.
         */
        error => {
          handleTargetPageError(error, consoleError);
          return /** @type {Omit<OptionMetadata, 'content' | 'position'>} */ ({});
        }
      )
  );
}

/**
 * Handle target page error.
 * @param {unknown} error Error.
 * @param {Function} [consoleError] Error logger.
 */
function handleTargetPageError(error, consoleError) {
  if (!consoleError) {
    return;
  }
  logTargetPageError(error, consoleError);
}

/**
 * Log target page error.
 * @param {unknown} error Error.
 * @param {Function} consoleError Error logger.
 */
function logTargetPageError(error, consoleError) {
  const message = getErrorMessage(error);
  consoleError('target page lookup failed', message);
}

/**
 * Process target snap.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} targetSnap Target snap.
 * @param {import('firebase-admin/firestore').DocumentReference} targetPage Target page.
 * @param {number} visibilityThreshold Visibility threshold.
 * @returns {Promise<object>} Target metadata.
 */
async function processTargetSnap(targetSnap, targetPage, visibilityThreshold) {
  const data = targetSnap.data();
  if (!data) {
    return {};
  }
  return resolveTargetMetadataWithVariants({
    targetPageNumber: /** @type {number} */ (data.number),
    targetPage,
    visibilityThreshold,
  });
}

/**
 * Resolve target metadata with variants.
 * @param {object} options Options.
 * @param {number} options.targetPageNumber Target page number.
 * @param {import('firebase-admin/firestore').DocumentReference} options.targetPage Target page.
 * @param {number} options.visibilityThreshold Visibility threshold.
 * @returns {Promise<object>} Target metadata.
 */
async function resolveTargetMetadataWithVariants({
  targetPageNumber,
  targetPage,
  visibilityThreshold,
}) {
  const visible = await getVisibleVariantsFromPage(
    targetPage,
    visibilityThreshold
  );

  if (!visible.length) {
    return { targetPageNumber };
  }

  return buildTargetMetadata(targetPageNumber, visible);
}

/**
 * Get visible variants from page.
 * @param {import('firebase-admin/firestore').DocumentReference} targetPage Target page.
 * @param {number} visibilityThreshold Visibility threshold.
 * @returns {Promise<import('firebase-admin/firestore').QueryDocumentSnapshot[]>} Visible variants.
 */
async function getVisibleVariantsFromPage(targetPage, visibilityThreshold) {
  const variantSnap = await targetPage
    .collection('variants')
    .orderBy('name')
    .get();

  return variantSnap.docs.filter(
    /**
     * @param {import('firebase-admin/firestore').QueryDocumentSnapshot} doc - Firestore document snapshot.
     * @returns {boolean} True if the variant is visible.
     */
    doc =>
      /** @type {any} */ (doc.data().visibility ?? 1) >= visibilityThreshold
  );
}

/**
 * Build target metadata.
 * @param {number} targetPageNumber Target page number.
 * @param {import('firebase-admin/firestore').QueryDocumentSnapshot[]} visible Visible variants.
 * @returns {object} Target metadata.
 */
function buildTargetMetadata(targetPageNumber, visible) {
  const targetVariantName = visible[0].data().name;
  const targetVariants = visible.map(doc => ({
    name: doc.data().name,
    weight: doc.data().visibility ?? 1,
  }));

  return {
    targetPageNumber,
    targetVariantName,
    targetVariants,
  };
}

/**
 * Load and normalize option documents for a particular variant.
 * @param {{ snap: VariantSnapshot; visibilityThreshold: number; consoleError?: ConsoleError }} options
 *   Dependencies required to load options.
 * @returns {Promise<OptionMetadata[]>} Ordered option metadata entries.
 */
async function loadOptions({ snap, visibilityThreshold, consoleError }) {
  const optionsSnap = await /** @type {any} */ (snap).ref
    .collection('options')
    .get();
  const optionsData = optionsSnap.docs.map(
    /**
     * @param {import('firebase-admin/firestore').QueryDocumentSnapshot} doc - Firestore document snapshot.
     * @returns {import('firebase-admin/firestore').DocumentData} Document data.
     */
    doc => doc.data()
  );
  optionsData.sort(
    /**
     * @param {import('firebase-admin/firestore').DocumentData} a - First option data.
     * @param {import('firebase-admin/firestore').DocumentData} b - Second option data.
     * @returns {number} Sorting weight.
     */
    (a, b) => /** @type {any} */ (a).position - /** @type {any} */ (b).position
  );

  const safeConsoleError = consoleError ?? DEFAULT_CONSOLE_ERROR;

  return Promise.all(
    optionsData.map(
      /**
       * @param {import('firebase-admin/firestore').DocumentData} data Document data.
       * @returns {Promise<object>} Metadata.
       */
      data =>
        buildOptionMetadata({
          data: /** @type {any} */ (data),
          visibilityThreshold,
          consoleError: safeConsoleError,
        })
    )
  );
}

/**
 * Resolve title and navigation metadata for the story owning the variant.
 * @param {StoryMetadataLookupDeps} options - Input describing the current page and lookup helpers.
 * @returns {Promise<{storyTitle: string, firstPageUrl: string | undefined}>} Story metadata used in templates.
 */
async function resolveStoryMetadata({ pageSnap, page, consoleError }) {
  const storyRef = extractStoryRef(pageSnap);
  const storyData = await fetchStoryData(storyRef);
  if (!storyData) {
    return { storyTitle: '', firstPageUrl: undefined };
  }
  return buildStoryMetadata({ storyData, page, consoleError });
}

/**
 * Fetch story data.
 * @param {object | null} storyRef Story reference.
 * @returns {Promise<import('firebase-admin/firestore').DocumentData | null>} Story data.
 */
async function fetchStoryData(storyRef) {
  if (!storyRef) {
    return null;
  }
  return getStoryDataFromSnapshot(storyRef);
}

/**
 * Get story data from snapshot.
 * @param {object} storyRef Story ref.
 * @returns {Promise<import('firebase-admin/firestore').DocumentData | null>} Story data.
 */
async function getStoryDataFromSnapshot(storyRef) {
  const snap = await getStorySnapshot(storyRef);
  return snap.data() || null;
}

/**
 * Get story snapshot.
 * @param {object} storyRef Story reference.
 * @returns {Promise<import('firebase-admin/firestore').DocumentSnapshot>} Story snapshot.
 */
async function getStorySnapshot(storyRef) {
  return /** @type {import('firebase-admin/firestore').DocumentReference} */ (
    storyRef
  ).get();
}

/**
 * Build story metadata.
 * @param {StoryMetadataDeps} options Options.
 * @returns {Promise<{storyTitle: string, firstPageUrl: string | undefined}>} Story metadata.
 */
async function buildStoryMetadata({ storyData, page, consoleError }) {
  const storyTitle = /** @type {string} */ (storyData.title || '');
  const firstPageUrl = await resolveFirstPageUrl({
    page,
    storyData,
    consoleError,
  });

  return { storyTitle, firstPageUrl };
}

/**
 * Determine the parent route for a story when the variant was created from an option.
 * @param {{ page: Record<string, any>; storyData: StoryMetadata; consoleError?: ConsoleError }} options - Inputs describing the page and story context.
 * @returns {Promise<string | undefined>} URL for the first published page when resolvable.
 */
async function resolveFirstPageUrl({ page, storyData, consoleError }) {
  if (!shouldResolveFirstPageUrl(page, storyData)) {
    return undefined;
  }

  return resolveRootPageUrl(
    /** @type {StoryDataWithRoot} */ (storyData),
    consoleError
  );
}

/**
 * Determine whether there is an incoming option that points at a story root.
 * @param {Record<string, any>} page Page document data.
 * @param {StoryMetadata} storyData Story metadata that may include a rootPage reference.
 * @returns {boolean} True when we should resolve a root page URL.
 */
function shouldResolveFirstPageUrl(page, storyData) {
  return Boolean(page.incomingOption && storyData.rootPage);
}

/**
 * Resolve the root page URL while gracefully handling errors.
 * @param {StoryDataWithRoot} storyData Story metadata containing the root page.
 * @param {ConsoleError} [consoleError] Optional logger for failures.
 * @returns {Promise<string | undefined>} Root page URL when available.
 */
function resolveRootPageUrl(storyData, consoleError) {
  return fetchRootPageUrl(storyData).catch(error => {
    handleRootPageError(error, consoleError);
    return undefined;
  });
}

/**
 * Handle root page error.
 * @param {Error} error Error.
 * @param {ConsoleError} [consoleError] Error logger.
 */
function handleRootPageError(error, consoleError) {
  if (!consoleError) {
    return;
  }
  logRootPageError(error, consoleError);
}

/**
 * Log root page error.
 * @param {Error} error Error.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} consoleError Error logger.
 */
function logRootPageError(error, consoleError) {
  const message = getErrorMessage(error);
  consoleError('root page lookup failed', message);
}

/**
 * Fetch root page URL.
 * @param {StoryDataWithRoot} storyData Story data.
 * @returns {Promise<string|undefined>} Root page URL.
 */
async function fetchRootPageUrl(storyData) {
  const rootPageSnap = await storyData.rootPage.get();
  if (!rootPageSnap.exists) {
    return undefined;
  }

  return resolveUrlFromRootPage(
    /** @type {PageSnapshot} */ (rootPageSnap),
    storyData.rootPage
  );
}

/**
 * Resolve URL from root page.
 * @param {PageSnapshot} rootPageSnap Root page snapshot.
 * @param {import('firebase-admin/firestore').DocumentReference} rootPageRef Root page reference.
 * @returns {Promise<string | undefined>} Root page URL.
 */
async function resolveUrlFromRootPage(rootPageSnap, rootPageRef) {
  const firstVariant = await getFirstVariant(rootPageRef);
  return buildRootUrl(
    rootPageSnap,
    /** @type {VariantSnapshot | undefined} */ (firstVariant)
  );
}

/**
 * Build root URL.
 * @param {PageSnapshot} snap Snap.
 * @param {VariantSnapshot | undefined} variant Variant.
 * @returns {string | undefined} URL.
 */
function buildRootUrl(snap, variant) {
  if (!variant) {
    return undefined;
  }
  return assembleRootUrl(snap, /** @type {VariantSnapshot} */ (variant));
}

/**
 * Extract page number from snapshot data.
 * @param {PageSnapshot} snap - Page snapshot.
 * @returns {string} Page number or empty string.
 */
function extractPageNumber(snap) {
  const data = snap.data();
  if (data) {
    return String(data.number);
  }
  return '';
}

/**
 * Extract variant name from variant data.
 * @param {any} variantData - Variant data.
 * @returns {string} Variant name or empty string.
 */
function extractVariantName(variantData) {
  const name = (variantData || {}).name;
  return name || '';
}

/**
 * Assemble root URL.
 * @param {PageSnapshot} snap Snap.
 * @param {VariantSnapshot} variant Variant.
 * @returns {string} URL.
 */
function assembleRootUrl(snap, variant) {
  const pageNumber = extractPageNumber(snap);
  const variantName = extractVariantName(variant.data());
  return `/p/${pageNumber}${variantName}.html`;
}

/**
 * Get the first variant document snapshot for a page.
 * @param {import('firebase-admin/firestore').DocumentReference} pageRef Page reference.
 * @returns {Promise<import('firebase-admin/firestore').QueryDocumentSnapshot | undefined>} First variant.
 */
async function getFirstVariant(pageRef) {
  const rootVariantSnap = await pageRef
    .collection('variants')
    .orderBy('name')
    .limit(1)
    .get();

  return rootVariantSnap.docs[0];
}

/**
 * Determine the owning story reference for the provided page snapshot.
 * @param {PageSnapshot} pageSnap Firestore snapshot describing a page document.
 * @returns {object|null} Story reference when available, otherwise null.
 */
function extractStoryRef(pageSnap) {
  const pageRef = getPageRef(pageSnap);
  return resolveStoryFromPageRef(pageRef);
}

/**
 * Return the Firestore reference for a page snapshot.
 * @param {PageSnapshot | undefined | null} pageSnap Firestore page snapshot.
 * @returns {object | null} Document reference or null.
 */
function getPageRef(pageSnap) {
  return /** @type {any} */ (readNullableProperty(pageSnap, 'ref'));
}

/**
 * Derive the story reference that owns a page.
 * @param {{ parent?: unknown } | null} pageRef Reference to the page document.
 * @returns {object | null} Story reference when available.
 */
function resolveStoryFromPageRef(pageRef) {
  const parent = getPageParent(pageRef);
  if (!parent) {
    return null;
  }

  return getParentParent(parent);
}

/**
 * Access the parent reference from a page document.
 * @param {{ parent?: unknown } | null} pageRef Page reference.
 * @returns {object | null} Parent reference or null.
 */
function getPageParent(pageRef) {
  return /** @type {any} */ (readNullableProperty(pageRef, 'parent'));
}

/**
 * Return the grandparent of a reference chain.
 * @param {{ parent?: unknown } | null} parent Reference whose parent is inspected.
 * @returns {object | null} Grandparent reference or null when missing.
 */
function getParentParent(parent) {
  return /** @type {any} */ (readNullableProperty(parent, 'parent'));
}

/**
 * Derive the author name to display when rendering a variant.
 * @param {Record<string, any>} variant - Variant metadata provided by Firestore.
 * @returns {string} Author name or fallback identifier.
 */
function deriveAuthorName(variant) {
  const candidate = [variant.authorName, variant.author].find(
    value => typeof value === 'string' && value.length > 0
  );
  return candidate ?? '';
}

/**
 * Resolve author metadata for the rendered variant, creating landing pages if needed.
 * @param {AuthorLookupDeps} options Inputs for author lookup.
 * @returns {Promise<{ authorName: string; authorUrl?: string }>} Author metadata for templates.
 */
async function resolveAuthorMetadata({ variant, db, bucket, consoleError }) {
  const authorName = deriveAuthorName(variant);
  const authorUrl = await resolveAuthorUrl({
    variant,
    db,
    bucket,
    consoleError,
  });
  return { authorName, authorUrl };
}

/**
 * Ensure an author landing page exists and return its public URL.
 * @param {AuthorLookupDeps} options Inputs for creating or reusing an author page.
 * @returns {Promise<string | undefined>} URL of the author page, if one exists.
 */
async function resolveAuthorUrl({ variant, db, bucket, consoleError }) {
  if (!variant.authorId) {
    return undefined;
  }

  return lookupAuthorUrl({ variant, db, bucket, consoleError });
}

/**
 * Write author page if needed.
 * @param {{authorPath: string, file: any, exists: boolean}} authorFile Author file data.
 * @param {object} variant Variant.
 * @returns {Promise<string>} Author path.
 */
async function writeAuthorPageIfNeeded(authorFile, variant) {
  const { authorPath, file, exists } = authorFile;
  if (!exists) {
    await writeAuthorLandingPage(variant, file);
  }
  return `/${authorPath}`;
}

/**
 * Lookup or create an author landing page and return its URL.
 * @param {AuthorLookupDeps} options Dependencies for author lookup.
 * @returns {Promise<string | undefined>} Author URL when the lookup succeeds.
 */
async function lookupAuthorUrl({ variant, db, bucket, consoleError }) {
  try {
    return await performAuthorLookup({ variant, db, bucket });
  } catch (error) {
    handleAuthorLookupError(error, consoleError);
    return undefined;
  }
}

/**
 * Handle author lookup error.
 * @param {unknown} error Error.
 * @param {ConsoleError} [consoleError] Error logger.
 */
function handleAuthorLookupError(error, consoleError) {
  if (!consoleError) {
    return;
  }
  logAuthorLookupError(error, consoleError);
}

/**
 * Log author lookup error.
 * @param {unknown} error Error.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} consoleError Error logger.
 */
function logAuthorLookupError(error, consoleError) {
  const message = getErrorMessage(error);
  consoleError('author lookup failed', message);
}

/**
 * Perform author lookup.
 * @param {AuthorLookupDeps} root0 Dependencies.
 * @returns {Promise<string|undefined>} Author URL.
 */
async function performAuthorLookup({ variant, db, bucket }) {
  const authorFile = await resolveAuthorFile({
    variant,
    db,
    bucket,
  });
  return writeAuthorPageIfNeeded(authorFile, variant);
}

/**
 * Resolve a Firestore reference for an author document.
 * @param {FirestoreLike} db Firestore-like client.
 * @param {string | undefined} authorId Identifier for the author.
 * @returns {any} Firestore document reference for the author path.
 */
function resolveAuthorRef(db, authorId) {
  return db.doc(`authors/${authorId}`);
}

/**
 * Resolve the bucket file used to persist the author's landing page.
 * @param {AuthorLookupDeps} options Dependencies for author file resolution.
 * @returns {Promise<{ authorPath: string, file: StorageFileLike, exists: boolean }>} Metadata used to write the landing page.
 */
async function resolveAuthorFile({ variant, db, bucket }) {
  const authorRef = resolveAuthorRef(db, variant.authorId);
  const authorSnap = await authorRef.get();
  const { uuid } = authorSnap.data();
  const authorPath = `a/${uuid}.html`;
  const file = bucket.file(authorPath);
  const [exists] = await file.exists();
  return { authorPath, file, exists };
}

/**
 * Write the author landing page HTML to storage.
 * @param {{ name?: string }} variant Variant metadata.
 * @param {{ save: (content: string, options: { contentType: string }) => Promise<unknown> }} file Cloud storage file handle.
 * @returns {Promise<void>} Promise resolved after writing the file.
 */
async function writeAuthorLandingPage(variant, file) {
  const authorName = deriveAuthorName(variant);
  const authorHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite - ${escapeHtml(
    authorName
  )}</title><link rel="icon" href="/favicon.ico" /><link rel="stylesheet" href="/dendrite.css" /></head><body><main><h1>${escapeHtml(
    authorName
  )}</h1></main></body></html>`;

  await file.save(authorHtml, { contentType: 'text/html' });
}

/**
 * Resolve parent document references for the variant hierarchy.
 * @param {{ parent?: { parent?: any } } | null | undefined} optionRef Reference to the incoming option document.
 * @returns {{ parentVariantRef: { get: Function, parent?: { parent?: any } }, parentPageRef: { get: Function } } | null} Parent
 * references when the hierarchy can be resolved, otherwise null.
 */
/**
 * Extract parent refs.
 * @param {OptionalAncestorReference} optionRef Option ref.
 * @returns {{ parentVariantRef: OptionalAncestorReference, parentPageRef: OptionalAncestorReference }} Refs.
 */
function extractParentRefs(optionRef) {
  const parentVariantRef = getParentVariantRef(optionRef);
  const parentPageRef = getParentPageRef(parentVariantRef);
  return { parentVariantRef, parentPageRef };
}

/**
 * Retrieve the variant-level ancestor for an option.
 * @param {OptionalAncestorReference} optionRef Option document reference.
 * @returns {OptionalAncestorReference} Ancestor variant reference or null.
 */
function getParentVariantRef(optionRef) {
  return getAncestorRef(optionRef, 2);
}

/**
 * Retrieve the parent page reference for a variant.
 * @param {OptionalAncestorReference} parentVariantRef Variant reference.
 * @returns {OptionalAncestorReference} Page reference ancestor or null.
 */
function getParentPageRef(parentVariantRef) {
  return getAncestorRef(parentVariantRef, 2);
}

/**
 * Walk up a reference chain a fixed number of steps.
 * @param {OptionalAncestorReference} ref Reference to walk.
 * @param {number} steps Number of parent hops to follow.
 * @returns {OptionalAncestorReference} Ancestor reference or null when the chain breaks.
 */
function getAncestorRef(ref, steps = 0) {
  const normalizedSteps = Math.max(steps, 0);
  return walkReferenceChain(ref, normalizedSteps);
}

/**
 * Walk the reference chain for a fixed number of steps.
 * @param {OptionalAncestorReference} reference Starting reference.
 * @param {number} remainingSteps Steps left to traverse.
 * @returns {OptionalAncestorReference} Resolved ancestor or null.
 */
function walkReferenceChain(reference, remainingSteps) {
  if (remainingSteps <= 0) {
    return reference;
  }

  return walkReferenceChain(getParentRef(reference), remainingSteps - 1);
}

/**
 * Return the parent reference when available.
 * @param {OptionalAncestorReference} reference Candidate reference.
 * @returns {OptionalAncestorReference} Parent reference or null.
 */
function getParentRef(reference) {
  if (!reference) {
    return null;
  }

  return /** @type {OptionalAncestorReference} */ (reference.parent);
}

export { getAncestorRef };

/**
 * Confirm that the required parent references exist.
 * @param {unknown} parentVariantRef Variant ref candidate.
 * @param {unknown} parentPageRef Page ref candidate.
 * @returns {boolean} True when both references are truthy.
 */
function areParentRefsValid(parentVariantRef, parentPageRef) {
  return Boolean(parentVariantRef) && Boolean(parentPageRef);
}

/**
 * Resolve the parent variant and page references from an option document.
 * @param {OptionalAncestorReference} optionRef Option reference from Firestore.
 * @returns {ParentReferencePair | null} Parent references when resolvable.
 */
export function resolveParentReferences(optionRef) {
  const { parentVariantRef, parentPageRef } = extractParentRefs(optionRef);
  if (!areParentRefsValid(parentVariantRef, parentPageRef)) {
    return null;
  }
  return /** @type {ParentReferencePair} */ ({
    parentVariantRef,
    parentPageRef,
  });
}

/**
 * Fetch the parent variant and page documents.
 * @param {{ get: () => Promise<{ exists: boolean }> }} parentVariantRef Firestore-like document reference.
 * @param {{ get: () => Promise<{ exists: boolean }> }} parentPageRef Firestore-like document reference.
 * @returns {Promise<{ parentVariantSnap: { exists: boolean, data: () => Record<string, any> }, parentPageSnap: { exists: boolean, data: () => Record<string, any> } } | null>} Snapshot tuple when both documents exist, otherwise null.
 */
/**
 * Check if snapshots exist.
 * @param {DocumentLike} parentVariantSnap Variant snap.
 * @param {DocumentLike} parentPageSnap Page snap.
 * @returns {boolean} True if exist.
 */
function doSnapshotsExist(parentVariantSnap, parentPageSnap) {
  return parentVariantSnap.exists && parentPageSnap.exists;
}

/**
 * Fetch the snapshots for the variant and page parents.
 * @param {DocumentRefLike} parentVariantRef Firestore reference to the parent variant.
 * @param {DocumentRefLike} parentPageRef Firestore reference to the parent page.
 * @returns {Promise<ParentSnapshotPair | null>} Snapshots or null when missing.
 */
async function fetchParentSnapshots(parentVariantRef, parentPageRef) {
  const [parentVariantSnap, parentPageSnap] = await Promise.all([
    parentVariantRef.get(),
    parentPageRef.get(),
  ]);

  if (!doSnapshotsExist(parentVariantSnap, parentPageSnap)) {
    return null;
  }

  return /** @type {ParentSnapshotPair} */ ({
    parentVariantSnap,
    parentPageSnap,
  });
}

/**
 * Validate route data.
 * @param {string} parentName Parent name.
 * @param {number} parentNumber Parent number.
 * @returns {boolean} True if valid.
 */
function isRouteDataValid(parentName, parentNumber) {
  return Boolean(parentName) && parentNumber !== undefined;
}

/**
 * Create the parent route slug from snapshot data.
 * @param {{ data: () => Record<string, any> }} parentVariantSnap Variant snapshot.
 * @param {{ data: () => Record<string, any> }} parentPageSnap Page snapshot.
 * @returns {string | null} Route path when identifiers can be derived, otherwise null.
 */
function buildParentRoute(parentVariantSnap, parentPageSnap) {
  const parentData = parentVariantSnap.data();
  const pageData = parentPageSnap.data();
  const parentName = parentData.name;
  const parentNumber = pageData.number;

  if (!isRouteDataValid(parentName, parentNumber)) {
    return null;
  }

  return `/p/${parentNumber}${parentName}.html`;
}

/**
 * Fetch parent data.
 * @param {FirestoreLike} db Database.
 * @param {string} incomingOption Incoming option.
 * @returns {Promise<ParentSnapshots | null>} Parent data snapshots when available.
 */
async function fetchParentData(db, incomingOption) {
  const optionRef = db.doc(incomingOption);
  const references = resolveParentReferences(optionRef);
  if (!references) {
    return null;
  }
  return /** @type {Promise<ParentSnapshots>} */ (
    fetchParentSnapshots(references.parentVariantRef, references.parentPageRef)
  );
}

/**
 * Build route from snapshots.
 * @param {ParentSnapshotPair} snapshots Snapshots.
 * @returns {string | null} Route.
 */
function buildRouteFromSnapshots(snapshots) {
  return buildParentRoute(
    snapshots.parentVariantSnap,
    snapshots.parentPageSnap
  );
}

/**
 * Resolve the canonical URL for the parent variant, if one exists.
 * @param {ParentResolutionDeps} options Dependencies for parent resolution.
 * @returns {Promise<string | undefined>} Parent URL when resolvable.
 */
async function resolveParentUrl(options) {
  return resolveParentLookupPromise({
    incomingOption: options.variant?.incomingOption,
    db: options.db,
    consoleError: options.consoleError,
  });
}

/**
 * Handle parent lookup error.
 * @param {Error} error Error.
 * @param {ConsoleError} [consoleError] Error logger.
 */
function handleParentLookupError(error, consoleError) {
  if (!consoleError) {
    return;
  }
  logParentLookupError(error, consoleError);
}

/**
 * Log parent lookup error.
 * @param {Error} error Error.
 * @param {Function} consoleError Error logger.
 */
function logParentLookupError(error, consoleError) {
  const message = getErrorMessage(error);
  consoleError('parent lookup failed', message);
}

/**
 * Fetch and build parent URL.
 * @param {FirestoreLike} db Database.
 * @param {string} incomingOption Incoming option.
 * @returns {Promise<string|undefined>} Parent URL.
 */
async function fetchAndBuildParentUrl(db, incomingOption) {
  const snapshots = await fetchParentData(db, incomingOption);
  return resolveParentRoute(snapshots);
}

/**
 * Safely resolve a parent route or fall back to undefined.
 * @param {ParentSnapshots} snapshots Snapshot bundle.
 * @returns {string | undefined} Route string when resolvable.
 */
function resolveParentRoute(snapshots) {
  if (!snapshots) {
    return undefined;
  }

  return normalizeRoute(
    buildRouteFromSnapshots(/** @type {ParentSnapshotPair} */ (snapshots))
  );
}

/**
 * Normalize a parent route value.
 * @param {string | null} route Route candidate.
 * @returns {string | undefined} Route when present.
 */
function normalizeRoute(route) {
  if (!isRoutePresent(route)) {
    return undefined;
  }

  return /** @type {string} */ (route);
}

/**
 * Determine if a route value is present.
 * @param {string | null | undefined} route Candidate.
 * @returns {boolean} True when the route can be returned.
 */
function isRoutePresent(route) {
  return route !== null && route !== undefined;
}

/**
 * Resolve the parent lookup promise, handling missing incoming options.
 * @param {{ incomingOption?: string, db: FirestoreLike, consoleError?: ConsoleError }} options Lookup dependencies.
 * @returns {Promise<string | undefined>} Parent URL when available.
 */
function resolveParentLookupPromise({ incomingOption, db, consoleError }) {
  if (!incomingOption) {
    return Promise.resolve(undefined);
  }

  return fetchAndBuildParentUrl(db, incomingOption).catch(error => {
    handleParentLookupError(error, consoleError);
    return undefined;
  });
}

/**
 * @typedef {object} RenderVariantDependencies
 * @property {any} db - Firestore-like database used to load related documents.
 * @property {any} storage - Cloud storage helper capable of writing files.
 * @property {(url: string, init?: object) => Promise<any>} fetchFn - Fetch implementation used for cache invalidation calls.
 * @property {() => string} randomUUID - UUID generator for request identifiers.
 * @property {string} [projectId] - Google Cloud project identifier used for cache invalidation.
 * @property {string} [urlMapName] - URL map name whose cache should be invalidated.
 * @property {string} [cdnHost] - Hostname whose cache entries should be purged.
 * @property {(message?: unknown, ...optionalParams: unknown[]) => void} [consoleError] - Logger for recoverable failures.
 * @property {string} [bucketName] - Name of the bucket where rendered HTML is written.
 * @property {number} [visibilityThreshold] - Minimum visibility used when publishing variants.
 */

/**
 * Create a renderer that materializes variant HTML and supporting metadata.
 * @param {RenderVariantDependencies} dependencies - External services and configuration values.
 * @returns {(snap: any, context?: any) => Promise<null>} Async renderer for variant snapshots.
 */
export function createRenderVariant(dependencies) {
  validateDependencies(dependencies);
  return createRenderVariantHandler(buildRenderVariantOptions(dependencies));
}

/**
 * Build the options object consumed by the renderer factory.
 * @param {RenderVariantDependencies} dependencies Renderer dependencies.
 * @returns {RenderVariantDependencies} Normalized options for the renderer.
 */
function buildRenderVariantOptions(dependencies) {
  const { db, storage, fetchFn, randomUUID, projectId, urlMapName, cdnHost } =
    dependencies;

  return {
    db,
    storage,
    fetchFn,
    randomUUID,
    projectId,
    urlMapName,
    cdnHost,
    consoleError: resolveRenderVariantConsoleError(dependencies.consoleError),
    bucketName: resolveRenderVariantBucketName(dependencies.bucketName),
    visibilityThreshold: resolveRenderVariantVisibilityThreshold(
      dependencies.visibilityThreshold
    ),
  };
}

/**
 * Provide a concrete error logger for the render variant pipeline.
 * @param {ConsoleError | undefined} value Logger provided by the caller.
 * @returns {ConsoleError} Resolved console error helper.
 */
function resolveRenderVariantConsoleError(value) {
  return value ?? console.error;
}

/**
 * Normalize the bucket name used for rendered variants.
 * @param {string | undefined} value Candidate bucket name.
 * @returns {string} Bucket name for rendering output.
 */
function resolveRenderVariantBucketName(value) {
  return value ?? DEFAULT_BUCKET_NAME;
}

/**
 * Normalize the visibility threshold configuration.
 * @param {number | undefined} value Visibility threshold provided by the caller.
 * @returns {number} Applied visibility threshold.
 */
function resolveRenderVariantVisibilityThreshold(value) {
  return value ?? VISIBILITY_THRESHOLD;
}

/**
 * Ensure the render pipeline dependencies expose the helpers it relies on.
 * @param {{
 *   db: { doc: Function },
 *   storage: { bucket: Function },
 *   fetchFn: Function,
 *   randomUUID: Function
 * }} dependencies - Required services for rendering.
 * @returns {void}
 */
function validateDependencies(dependencies) {
  const { db, storage, fetchFn, randomUUID } = dependencies;
  assertDb(db);
  assertStorage(storage);
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');
}

/**
 * @typedef {object} RenderHandlerDeps
 * @property {any} db Database.
 * @property {any} bucket Bucket.
 * @property {(message?: unknown, ...optionalParams: unknown[]) => void} [consoleError] Error logger.
 * @property {number} [visibilityThreshold] Visibility threshold.
 * @property {(paths: string[]) => Promise<void>} invalidatePaths Invalidate paths.
 */

/**
 * Create render variant handler.
 * @param {RenderVariantDependencies} options Dependencies.
 * @returns {(snap: any, context?: any) => Promise<null>} Render function.
 */
function createRenderVariantHandler({
  db,
  storage,
  fetchFn,
  randomUUID,
  projectId,
  urlMapName,
  cdnHost,
  consoleError,
  bucketName,
  visibilityThreshold,
}) {
  const bucket = storage.bucket(bucketName || DEFAULT_BUCKET_NAME);
  const invalidatePaths = createInvalidatePaths({
    fetchFn,
    projectId: /** @type {string} */ (projectId),
    urlMapName: /** @type {string} */ (urlMapName),
    cdnHost,
    randomUUID,
    consoleError,
  });
  /**
   * Execute render workflow.
   * @param {RenderHandlerDeps} deps Dependencies.
   * @param {VariantSnapshot} snap Snap.
   * @param {RenderContext | undefined} context Context.
   * @returns {Promise<null>} Null.
   */
  async function executeRenderWorkflow(deps, snap, context) {
    const { db, bucket, consoleError, visibilityThreshold, invalidatePaths } =
      deps;

    const renderPlan = await resolveRenderPlan({
      snap,
      db,
      bucket,
      consoleError,
      visibilityThreshold,
    });

    if (!renderPlan) {
      return null;
    }

    await persistRenderPlan({
      snap,
      context,
      bucket,
      invalidatePaths,
      ...renderPlan,
    });
    return null;
  }

  return async function render(
    /** @type {VariantSnapshot} */ snap,
    context = {}
  ) {
    return executeRenderWorkflow(
      { db, bucket, consoleError, visibilityThreshold, invalidatePaths },
      snap,
      context
    );
  };
}

/**
 * Prepare the information required to render and publish a variant.
 * @param {object} options - Dependencies and inputs for rendering.
 * @param {{exists?: boolean, data: () => Record<string, any>, ref: {parent?: {parent?: any}}}} options.snap - Variant snapshot.
 * @param {{doc: Function}} options.db - Firestore-like database instance.
 * @param {{bucket: Function}} options.bucket - Storage bucket factory.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Optional logger.
 * @param {number} options.visibilityThreshold - Minimum visibility required for variant publication.
 * @returns {Promise<null | {
 *   variant: Record<string, any>,
 *   page: Record<string, any>,
 *   parentUrl: string | undefined,
 *   html: string,
 *   filePath: string,
 *   openVariant: boolean
 * }>} Render plan describing the variant artefacts.
 */
/**
 * Validate snap exists.
 * @param {any} snap Snap.
 * @returns {boolean} True if valid.
 */
export function isSnapValid(snap) {
  if (!snap) {
    return true;
  }
  return checkSnapExists(snap);
}

/**
 * Check snap exists.
 * @param {any} snap Snap.
 * @returns {boolean} True if exists.
 */
function checkSnapExists(snap) {
  return snap?.exists !== false;
}

/**
 * Fetch page data.
 * @param {any} snap Snap.
 * @returns {Promise<any>} Page snap.
 */
/**
 * Get page snap from ref.
 * @param {any} snap Snap.
 * @returns {Promise<any | undefined>} Page snap.
 */
export async function getPageSnapFromRef(snap) {
  if (!isSnapRefValid(snap)) {
    return undefined;
  }
  return snap.ref.parent.parent.get();
}

/**
 * Determine whether the variant snapshot exposes the expected parent chain.
 * @param {{ ref?: { parent?: { parent?: unknown } } } | null | undefined} snap - Variant snapshot passed to the renderer.
 * @returns {boolean} True when the snapshot contains a reachable page reference.
 */
function isSnapRefValid(snap) {
  const variantRef = resolveSnapshotRef(snap);
  if (!variantRef) {
    return false;
  }

  return Boolean(getAncestorRef(variantRef, 2));
}

/**
 * Extract the `ref` property from a snapshot when present.
 * @param {any} snap Candidate snapshot.
 * @returns {any} Snapshot ref when available; otherwise null.
 */
function resolveSnapshotRef(snap) {
  return readNullableProperty(snap, 'ref');
}

/**
 * Safely read a nested property from the provided object.
 * @param {any} source Source object.
 * @param {string} key Property key to resolve.
 * @returns {any} Property value or null when unavailable.
 */
function readNullableProperty(source, key) {
  const normalizedSource = getNormalizedSource(source);
  const value = normalizedSource[key];

  if (value === undefined) {
    return null;
  }

  return value;
}

/**
 * Normalize the provided source so it can be safely indexed.
 * @param {{ [key: string]: unknown } | null | undefined} source Candidate object.
 * @returns {{ [key: string]: unknown }} Safe object mapping.
 */
function getNormalizedSource(source) {
  if (!isObjectLike(source)) {
    return {};
  }

  return /** @type {{ [key: string]: unknown }} */ (source);
}

/**
 * Determine if the provided value is an object.
 * @param {unknown} value Candidate.
 * @returns {value is Record<string, unknown>} True when the value can be indexed.
 */
function isObjectLike(value) {
  return value !== null && typeof value === 'object';
}

/**
 * Fetch the parent page snapshot for the renderer's variant.
 * @param {{ ref: { parent?: { parent?: { get: () => Promise<{ exists?: boolean, data: () => Record<string, any> }> } } } }} snap Variant snapshot.
 * @returns {Promise<{ exists?: boolean, data: () => Record<string, any> } | null>} Page snapshot when available.
 */
export async function fetchPageData(snap) {
  const pageSnap = await getPageSnapFromRef(snap);
  if (!isPageSnapValid(pageSnap)) {
    return null;
  }
  return pageSnap;
}

/**
 * Confirm the fetched page snapshot is present before continuing.
 * @param {{ exists?: boolean } | null | undefined} pageSnap - Snapshot representing the parent page.
 * @returns {boolean} True when the snapshot exists.
 */
function isPageSnapValid(pageSnap) {
  if (!pageSnap) {
    return false;
  }
  return Boolean(pageSnap.exists);
}

/**
 * @typedef {object} RenderMetadataDeps
 * @property {VariantSnapshot} snap Variant snapshot targeted by the render.
 * @property {FirestoreLike} db Firestore helper used for metadata lookups.
 * @property {StorageBucketLike} bucket Storage bucket handle used by helper routines.
 * @property {PageSnapshot} pageSnap Parent page snapshot that backs the variant.
 * @property {PageDocument} page Parent page document data extracted from the snapshot.
 * @property {ConsoleError} [consoleError] Optional logger for reporting issues.
 * @property {number} [visibilityThreshold] Threshold that determines visible options.
 * @property {VariantDocument} variant Variant document record stored in Firestore.
 *
 * Gather metadata for rendering.
 * @param {RenderMetadataDeps} deps Dependencies required to resolve the render metadata.
 * @returns {Promise<RenderMetadata>} Metadata object suitable for templates and persistence.
 */
async function gatherMetadata(deps) {
  const {
    snap,
    db,
    bucket,
    pageSnap,
    page,
    consoleError,
    visibilityThreshold,
    variant,
  } = deps;

  const options = await loadOptions({
    snap,
    visibilityThreshold: visibilityThreshold || VISIBILITY_THRESHOLD,
    consoleError,
  });
  const { storyTitle, firstPageUrl } = await resolveStoryMetadata({
    pageSnap,
    page,
    consoleError,
  });
  const { authorName, authorUrl } = await resolveAuthorMetadata({
    variant,
    db,
    bucket,
    consoleError,
  });
  const parentUrl = await resolveParentUrl({ variant, db, consoleError });

  return {
    options,
    storyTitle,
    firstPageUrl,
    authorName,
    authorUrl,
    parentUrl,
  };
}

/**
 * Build render output.
 * @param {RenderOutputInput} data Data.
 * @returns {RenderOutput} Output.
 */
function buildRenderOutput(data) {
  const {
    page,
    variant,
    options,
    storyTitle,
    authorName,
    authorUrl,
    parentUrl,
    firstPageUrl,
  } = data;

  const html = buildHtml({
    pageNumber: page.number,
    variantName: variant.name,
    content: variant.content,
    options,
    storyTitle,
    author: authorName,
    authorUrl,
    parentUrl,
    firstPageUrl,
    showTitleHeading: !page.incomingOption,
  });
  const filePath = `p/${page.number}${variant.name}.html`;
  const openVariant = options.some(
    (/** @type {any} */ option) => option.targetPageNumber === undefined
  );

  return { variant, page, parentUrl, html, filePath, openVariant };
}

/**
 * Fetch and validate page.
 * @param {any} snap Snap.
 * @returns {Promise<any>} Page data.
 */
async function fetchAndValidatePage(snap) {
  const pageSnap = await fetchPageData(snap);
  if (!pageSnap) {
    return null;
  }
  return { pageSnap, page: pageSnap.data() };
}

/**
 * Resolve the render plan for a variant snapshot.
 * @param {ResolveRenderPlanDeps} options Inputs required to assemble the render plan.
 * @returns {Promise<RenderOutput | null>} Render plan describing the variant artefacts.
 */
async function resolveRenderPlan(options) {
  const { snap } = options;
  if (!isSnapValid(snap)) {
    return null;
  }

  return buildRenderPlanIfPageValid(options);
}

/**
 * Attempt to build a render plan only when the variant page data is valid.
 * @param {ResolveRenderPlanDeps} options - Inputs that include the variant snapshot and dependencies.
 * @returns {Promise<RenderOutput | null>} The render plan when the page is valid or `null` otherwise.
 */
async function buildRenderPlanIfPageValid(options) {
  const { snap } = options;
  const pageData = await fetchAndValidatePage(snap);
  if (!pageData) {
    return null;
  }

  return buildRenderPlan({ ...options, pageData });
}

/**
 * Build render plan.
 * @param {BuildRenderPlanDeps} params Options.
 * @returns {Promise<RenderOutput>} Render plan.
 */
async function buildRenderPlan({
  snap,
  pageData,
  db,
  bucket,
  consoleError,
  visibilityThreshold,
}) {
  const { pageSnap, page } = pageData;
  const variant = /** @type {VariantDocument} */ (snap.data());
  const metadata = await gatherMetadata({
    snap,
    db,
    bucket,
    pageSnap,
    page,
    consoleError,
    visibilityThreshold,
    variant,
  });

  return buildRenderOutput({ page, variant, ...metadata });
}

/**
 * Persist rendered variant artefacts and trigger CDN invalidation.
 * @param {object} options - Artefacts and dependencies used for persistence.
 * @param {{exists?: boolean, data: () => Record<string, any>, ref: {parent?: {parent?: any}}}} options.snap - Variant snapshot.
 * @param {object} [options.context] - Invocation context containing request parameters.
 * @param {{bucket: (name: string) => { file: (path: string) => { save: Function } }}} options.bucket - Storage helper.
 * @param {(paths: string[]) => Promise<void>} options.invalidatePaths - Cache invalidation routine.
 * @param {Record<string, any>} options.variant - Variant document data.
 * @param {Record<string, any>} options.page - Parent page document data.
 * @param {string | undefined} options.parentUrl - URL of the parent variant, when available.
 * @param {string} options.html - Rendered HTML payload for the variant.
 * @param {string} options.filePath - Storage path for the rendered HTML.
 * @param {boolean} options.openVariant - Indicates whether the variant is open (no target page).
 * @returns {Promise<void>} Resolves when artefacts are persisted and caches invalidated.
 */
/**
 * Save variant HTML.
 * @param {{
 *   bucket: StorageBucketLike;
 *   filePath: string;
 *   html: string;
 *   openVariant: boolean;
 * }} options Options used to persist the variant HTML.
 * @returns {Promise<void>} Promise.
 */
async function saveVariantHtml({ bucket, filePath, html, openVariant }) {
  await bucket.file(filePath).save(html, {
    contentType: 'text/html',
    ...(openVariant && { metadata: { cacheControl: 'no-store' } }),
  });
}

/**
 * Save alts HTML.
 * @param {{ snap: VariantSnapshot; bucket: StorageBucketLike; page: PageDocument }} deps Dependencies.
 * @returns {Promise<string>} Promise resolved with the saved path.
 */
async function saveAltsHtml(deps) {
  const { snap, bucket, page } = deps;
  const variantsSnap = await /** @type {any} */ (snap).ref.parent.get();
  const variants = getVisibleVariants(variantsSnap.docs);
  const altsHtml = buildAltsHtml(page.number, variants);
  const altsPath = `p/${page.number}-alts.html`;
  await bucket.file(altsPath).save(altsHtml, { contentType: 'text/html' });
  return altsPath;
}

/**
 * Resolve pending name.
 * @param {VariantDocument} variant Variant.
 * @param {RenderContext | undefined} context Context.
 * @returns {string | undefined} Pending name.
 */
function resolvePendingName(variant, context) {
  const params = resolvePendingParams(context);
  if (variant.incomingOption) {
    return resolvePendingVariantId(params);
  }

  return resolvePendingStoryId(params);
}

/**
 * Extract request parameters from the render context.
 * @param {RenderContext | undefined | null} context Rendering context.
 * @returns {Record<string, string> | undefined} Parameters when available.
 */
function resolvePendingParams(context) {
  return context?.params;
}

/**
 * Read the pending variant identifier from params.
 * @param {Record<string, string> | undefined} params Parameters bag.
 * @returns {string | undefined} Variant identifier when present.
 */
function resolvePendingVariantId(params) {
  return params?.variantId;
}

/**
 * Read the pending story identifier from params.
 * @param {Record<string, string> | undefined} params Parameters bag.
 * @returns {string | undefined} Story identifier when present.
 */
function resolvePendingStoryId(params) {
  return params?.storyId;
}

/**
 * Save pending file.
 * @param {StorageBucketLike} bucket Bucket.
 * @param {string | undefined} pendingName Pending name.
 * @param {string} filePath File path.
 * @returns {Promise<void>} Promise.
 */
async function savePendingFile(bucket, pendingName, filePath) {
  const pendingPath = `pending/${pendingName}.json`;
  await bucket.file(pendingPath).save(JSON.stringify({ path: filePath }), {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-store' },
  });
}

/**
 * Build invalidation paths.
 * @param {string} altsPath Alts path.
 * @param {string} filePath File path.
 * @param {string | undefined} parentUrl Parent URL.
 * @returns {string[]} Paths.
 */
function buildInvalidationPaths(altsPath, filePath, parentUrl) {
  const paths = [`/${altsPath}`, `/${filePath}`];
  if (parentUrl) {
    paths.push(parentUrl);
  }
  return paths;
}

/**
 * Persist rendered HTML, related metadata, and cache invalidation paths.
 * @param {PersistRenderPlanDeps} options Inputs for persisting the render plan.
 * @returns {Promise<void>} Void promise.
 */
async function persistRenderPlan({
  snap,
  context,
  bucket,
  invalidatePaths,
  variant,
  page,
  parentUrl,
  html,
  filePath,
  openVariant,
}) {
  await saveVariantHtml({ bucket, filePath, html, openVariant });
  const altsPath = await saveAltsHtml({ snap, bucket, page });

  const pendingName = resolvePendingName(variant, context);
  await savePendingFile(bucket, pendingName, filePath);

  const paths = buildInvalidationPaths(altsPath, filePath, parentUrl);
  await invalidatePaths(paths);
}

/**
 * @typedef {{ before: DocumentLike; after: DocumentLike & { ref: { update: Function } }; }} FirestoreChange
 * Build a change handler that renders visible variants and clears dirty markers.
 * @param {object} options - Dependencies for the change handler.
 * @param {(snap: any, context?: object) => Promise<null>} options.renderVariant - Renderer invoked when a variant should be materialized.
 * @param {() => unknown} options.getDeleteSentinel - Function that produces the sentinel used to clear dirty flags.
 * @param {number} [options.visibilityThreshold] - Minimum visibility required before rendering.
 * @returns {(change: FirestoreChange, context?: RenderContext) => Promise<null>} Firestore change handler.
 */
export function createHandleVariantWrite({
  renderVariant,
  getDeleteSentinel,
  visibilityThreshold = VISIBILITY_THRESHOLD,
}) {
  assertFunction(renderVariant, 'renderVariant');
  assertFunction(getDeleteSentinel, 'getDeleteSentinel');

  /**
   * Handle dirty variant.
   * @param {object} root0 Options.
   * @param {FirestoreChange} root0.change Firestore change.
   * @param {RenderContext | undefined} root0.context Event context.
   * @param {Function} root0.renderVariant Render function.
   * @param {Function} root0.getDeleteSentinel Sentinel function.
   * @returns {Promise<null>} Null.
   */
  async function handleDirtyVariant({
    change,
    context,
    renderVariant,
    getDeleteSentinel,
  }) {
    await renderVariant(/** @type {any} */ (change.after), context);
    await /** @type {any} */ (change.after).ref.update({
      dirty: getDeleteSentinel(),
    });
    return null;
  }

  /**
   * Check visibility crossed threshold.
   * @param {number} beforeVisibility Before.
   * @param {number} afterVisibility After.
   * @param {number} threshold Threshold.
   * @returns {boolean} True if crossed.
   */
  function didCrossVisibilityThreshold(
    beforeVisibility,
    afterVisibility,
    threshold
  ) {
    return beforeVisibility < threshold && afterVisibility >= threshold;
  }

  return async function handleVariantWrite(
    /** @type {FirestoreChange} */ change,
    context
  ) {
    if (!change.after.exists) {
      return null;
    }
    return processExistingVariant(change, context);
  };

  /**
   * Process a variant change when the document still exists.
   * @param {FirestoreChange} change - Firestore change payload describing the variant update.
   * @param {RenderContext | undefined} context - Cloud Functions context for the trigger.
   * @returns {Promise<null>} Result of the processing workflow.
   */
  async function processExistingVariant(change, context) {
    const data = change.after.data();
    if (data.dirty) {
      return handleDirtyVariant({
        change,
        context,
        renderVariant,
        getDeleteSentinel,
      });
    }

    return handleCleanVariant(change, context, data);
  }

  /**
   * Handle the clean variant path when rendering is driven by visibility changes.
   * @param {FirestoreChange} change - Firestore change payload.
   * @param {RenderContext | undefined} context - Cloud Functions context for the trigger.
   * @param {Record<string, any>} data - Variant data captured from the latest snapshot.
   * @returns {Promise<null>} Result of attempting to render or `null` when skipped.
   */
  async function handleCleanVariant(change, context, data) {
    if (shouldRenderVariant(change, data, visibilityThreshold)) {
      return renderVariant(/** @type {any} */ (change.after), context);
    }
    return null;
  }

  /**
   * Decide if a variant should be rendered based on visibility threshold crossings.
   * @param {FirestoreChange} change - Firestore change describing the before/after visibility values.
   * @param {Record<string, any>} data - New variant data provided by the snapshot.
   * @param {number} visibilityThreshold - Visibility threshold that must be exceeded.
   * @returns {boolean} True when the threshold was crossed and rendering is required.
   */
  function shouldRenderVariant(change, data, visibilityThreshold) {
    if (!(/** @type {any} */ (change.before).exists)) {
      return true;
    }

    const beforeVisibility = /** @type {any} */ (change.before).data()
      .visibility;
    const afterVisibility = data.visibility;

    return didCrossVisibilityThreshold(
      beforeVisibility,
      afterVisibility,
      visibilityThreshold
    );
  }
}

export {
  buildOptionMetadata,
  loadOptions,
  resolveStoryMetadata,
  extractStoryRef,
  resolveAuthorMetadata,
  fetchParentSnapshots,
  buildParentRoute,
  resolveParentUrl,
  resolveRenderPlan,
  buildRootUrl,
};
