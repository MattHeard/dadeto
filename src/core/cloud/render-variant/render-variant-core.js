import { assertFunction, DEFAULT_BUCKET_NAME } from './cloud-core.js';

export { DEFAULT_BUCKET_NAME } from './cloud-core.js';
export const VISIBILITY_THRESHOLD = 0.5;

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

const HEADER_HTML = `
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
    </div>
`;

const GOOGLE_SIGNIN_SCRIPTS = `
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
`;

const MENU_TOGGLE_SCRIPT = `
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
`;

const VARIANT_REDIRECT_SCRIPT = `
    <script>
      (function () {
        function pickWeighted(pairs) {
          let total = 0;
          for (const p of pairs) {
            const w = Number(p.w);
            if (!Number.isFinite(w) || w <= 0) continue;
            total += w;
          }
          if (total <= 0) return null;
          const a = new Uint32Array(1);
          crypto.getRandomValues(a);
          const u = (a[0] + 1) / 4294967297;
          let threshold = u * total;
          for (const p of pairs) {
            const w = Number(p.w);
            if (!Number.isFinite(w) || w <= 0) continue;
            threshold -= w;
            if (threshold <= 0) return p.slug;
          }
          return pairs[pairs.length - 1]?.slug ?? null;
        }
        function parseVariants(attr) {
          if (!attr) return [];
          const trimmed = attr.trim();
          if (!trimmed) return [];
          if (trimmed[0] === '[' || trimmed[0] === '{') {
            try {
              const arr = JSON.parse(trimmed);
              if (Array.isArray(arr))
                return arr.map(x => ({ slug: x.slug, w: x.w }));
            } catch {}
            return [];
          }
          return trimmed
            .split(',')
            .map(pair => {
              const [slug, w] = pair.split(':');
              return { slug: slug?.trim(), w: Number(w ?? 1) };
            })
            .filter(x => x.slug);
        }
        function rewriteLink(a) {
          const raw = a.getAttribute('data-variants');
          const pairs = parseVariants(raw);
          if (!pairs.length) return;
          const chosen = pickWeighted(pairs);
          if (!chosen) return;
          try {
            const href = new URL(a.getAttribute('href', 2), location.href);
            const chosenUrl = new URL(href, location.href);
            const parts = chosenUrl.pathname.split('/');
            parts[parts.length - 1] = chosen + '.html';
            chosenUrl.pathname = parts.join('/');
            a.setAttribute('href', chosenUrl.toString());
            a.setAttribute('data-chosen-variant', chosen);
          } catch {}
        }
        function init() {
          const links = document.querySelectorAll(
            'a.variant-link[data-variants]'
          );
          links.forEach(rewriteLink);
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', init);
        } else {
          init();
        }
      })();
    </script>
`;

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
 *
 * @param {number} pageNumber - Page number the option belongs to.
 * @param {string} variantName - Variant identifier tied to the option.
 * @param {object} option - Option metadata from Firestore.
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
 * @param {object[]} options - List of variant navigation options.
 * @returns {string} Joined HTML list of options.
 */
function buildOptionsHtml(pageNumber, variantName, options) {
  return options
    .map(option => buildOptionItem(pageNumber, variantName, option))
    .join('');
}

/**
 * Build the rendered option items for the resolved build data.
 * @param {{ pageNumber: number, variantName: string, options: unknown }} resolvedParams - Normalized parameters.
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
 * @param {string} storyTitle - Title shown in the document's `<title>`.
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
 * @param {string} author - Name of the story author.
 * @param {string} authorUrl - Optional author link.
 * @returns {string} Author credits HTML.
 */
function buildAuthorHtml(author, authorUrl) {
  if (!author) return '';
  if (authorUrl) {
    return `<p>By <a href="${authorUrl}">${escapeHtml(author)}</a></p>`;
  }
  return `<p>By ${escapeHtml(author)}</p>`;
}

/**
 *
 * @param {string} url - Target URL for the back/first page links.
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
  const variantSlug = `${pageNumber}${variantName}`;
  return (
    '<p><a id="reportLink" href="#">⚑ Report</a></p>' +
    `<script>document.getElementById('reportLink').onclick=async e=>{e.preventDefault();try{await fetch('https://europe-west1-irien-465710.cloudfunctions.net/prod-report-for-moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:'${variantSlug}'})});alert('Thanks for your report.');}catch(e){alert('Sorry, something went wrong.');}};</script>`
  );
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
 * @param {{ pageNumber: number, variantName: string }} resolvedParams - Normalized build inputs.
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
};

/**
 * Render a variant page given normalized build input.
 * @param {{
 *   pageNumber: number,
 *   variantName: string,
 *   content: string,
 *   options: unknown,
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
    .map(doc => ({
      name: doc.data().name || '',
      content: doc.data().content || '',
    }));
}

/**
 * Ensure a Firestore-like database instance exposes the required helpers.
 * @param {{doc: Function}} db - Database instance that should provide a `doc` helper.
 * @throws {TypeError} When the provided database does not expose a `doc` function.
 */
function assertDb(db) {
  if (!db || typeof db.doc !== 'function') {
    throw new TypeError('db must provide a doc helper');
  }
}

/**
 * Confirm the storage dependency can create bucket handles.
 * @param {{bucket: Function}} storage - Storage implementation expected to expose a `bucket` helper.
 * @throws {TypeError} When the provided storage does not expose a `bucket` function.
 */
function assertStorage(storage) {
  if (!storage || typeof storage.bucket !== 'function') {
    throw new TypeError('storage must provide a bucket helper');
  }
}

/**
 * Build a helper that invalidates CDN paths via the Google Compute API.
 * @param {object} options - Configuration for cache invalidation.
 * @param {(url: string, init?: object) => Promise<{ok: boolean, status: number, json: () => Promise<object>}>} options.fetchFn - Fetch implementation used to communicate with the metadata and compute APIs.
 * @param {string} [options.projectId] - Google Cloud project identifier owning the URL map.
 * @param {string} [options.urlMapName] - Name of the URL map whose cache should be invalidated.
 * @param {string} [options.cdnHost] - Hostname associated with the CDN-backed site.
 * @param {() => string} options.randomUUID - UUID generator for cache invalidation requests.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger invoked when invalidation fails.
 * @returns {(paths: string[]) => Promise<void>} Invalidation routine that accepts absolute paths to purge.
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

  const host = cdnHost || 'www.dendritestories.co.nz';
  const urlMap = urlMapName || 'prod-dendrite-url-map';
  const resolvedProjectId = projectId || '';

  /**
   * Retrieve an access token from the metadata server for authenticated requests.
   * @returns {Promise<string>} Resolves with a short-lived OAuth access token.
   */
  async function getAccessToken() {
    const response = await fetchFn(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );

    if (!response.ok) {
      throw new Error(`metadata token: HTTP ${response.status}`);
    }

    const { access_token: accessToken } = await response.json();

    return accessToken;
  }

  return async function invalidatePaths(paths) {
    if (!Array.isArray(paths) || paths.length === 0) {
      return;
    }

    const token = await getAccessToken();
    const url = `https://compute.googleapis.com/compute/v1/projects/${resolvedProjectId}/global/urlMaps/${urlMap}/invalidateCache`;

    await Promise.all(
      paths.map(async path => {
        try {
          const response = await fetchFn(url, {
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
          });

          if (!response.ok && consoleError) {
            consoleError(`invalidate ${path} failed: ${response.status}`);
          }
        } catch (error) {
          if (consoleError) {
            consoleError(`invalidate ${path} error`, error?.message || error);
          }
        }
      })
    );
  };
}

/**
 * Construct metadata for a single option attached to a story variant.
 * @param {object} options - Information about the option to prepare for rendering.
 * @param {Record<string, any>} options.data - Raw option document data.
 * @param {number} options.visibilityThreshold - Minimum visibility required for a variant to be considered published.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} options.consoleError - Logger for recoverable failures.
 * @returns {Promise<object>} Metadata describing the option suitable for HTML rendering.
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

  return {
    content: data.content,
    position: data.position,
    ...targetMetadata,
  };
}

/**
 * Resolve the target metadata referenced by an option document.
 * @param {Record<string, any>} data Raw option document data.
 * @param {number} visibilityThreshold Minimum visibility required for variants.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [consoleError] Optional logger for errors.
 * @returns {Promise<{targetPageNumber?: number, targetVariantName?: string, targetVariants?: {name: string, weight: number}[]}>} Target metadata derived from the option.
 */
async function resolveTargetMetadata(data, visibilityThreshold, consoleError) {
  let targetPageNumber;
  let targetVariantName;
  let targetVariants;

  if (data.targetPage) {
    ({ targetPageNumber, targetVariantName, targetVariants } =
      await fetchTargetPageMetadata(
        data.targetPage,
        visibilityThreshold,
        consoleError
      ));
  } else if (data.targetPageNumber !== undefined) {
    targetPageNumber = data.targetPageNumber;
  }

  return {
    targetPageNumber,
    targetVariantName,
    targetVariants,
  };
}

/**
 * Retrieve metadata for a referenced target page, including the first visible variant.
 * @param {object} targetPage Firestore reference for the target page document.
 * @param {number} visibilityThreshold Minimum visibility required for a variant to be considered published.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [consoleError] Optional logger for unexpected failures.
 * @returns {Promise<{
 *   targetPageNumber?: number,
 *   targetVariantName?: string,
 *   targetVariants?: {name: string, weight: number}[],
 * }>} Metadata derived from the target page lookup.
 */
async function fetchTargetPageMetadata(
  targetPage,
  visibilityThreshold,
  consoleError
) {
  try {
    const targetSnap = await targetPage.get();

    if (!targetSnap.exists) {
      return {};
    }

    const targetPageNumber = targetSnap.data().number;
    const variantSnap = await targetPage
      .collection('variants')
      .orderBy('name')
      .get();
    const visible = variantSnap.docs.filter(
      doc => (doc.data().visibility ?? 1) >= visibilityThreshold
    );

    if (!visible.length) {
      return { targetPageNumber };
    }

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
  } catch (error) {
    if (consoleError) {
      consoleError('target page lookup failed', error?.message || error);
    }
    return {};
  }
}

/**
 * Load and normalize option documents for a particular variant.
 * @param {object} options - Dependencies required to load options.
 * @param {{ref: {collection: Function}}} options.snap - Firestore snapshot for the variant whose options are being read.
 * @param {number} options.visibilityThreshold - Minimum visibility required for inclusion.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<object[]>} Ordered option metadata entries.
 */
async function loadOptions({ snap, visibilityThreshold, consoleError }) {
  const optionsSnap = await snap.ref.collection('options').get();
  const optionsData = optionsSnap.docs.map(doc => doc.data());
  optionsData.sort((a, b) => a.position - b.position);

  return Promise.all(
    optionsData.map(data =>
      buildOptionMetadata({
        data,
        visibilityThreshold,
        consoleError,
      })
    )
  );
}

/**
 * Resolve title and navigation metadata for the story owning the variant.
 * @param {object} options - Input describing the current page and lookup helpers.
 * @param {{ref: {parent?: {parent?: any}}, get: Function, exists: boolean}} options.pageSnap - Firestore snapshot for the current page.
 * @param {Record<string, any>} options.page - Raw page document data.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} options.consoleError - Logger for recoverable failures.
 * @returns {Promise<{storyTitle: string, firstPageUrl: string | undefined}>} Story metadata used in templates.
 */
async function resolveStoryMetadata({ pageSnap, page, consoleError }) {
  const storyRef = extractStoryRef(pageSnap);
  const storySnap = await storyRef.get();
  const storyData = storySnap.data();
  const storyTitle = storyData.title;
  const firstPageUrl = await resolveFirstPageUrl({
    page,
    storyData,
    consoleError,
  });

  return { storyTitle, firstPageUrl };
}

/**
 * Determine the parent route for a story when the variant was created from an option.
 * @param {object} options - Inputs describing the page and story context.
 * @param {Record<string, any>} options.page Raw page document data.
 * @param {Record<string, any>} options.storyData Story metadata that includes a rootPage reference.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] Optional logger for recoverable failures.
 * @returns {Promise<string | undefined>} URL for the first published page when resolvable.
 */
async function resolveFirstPageUrl({ page, storyData, consoleError }) {
  if (!page.incomingOption || !storyData.rootPage) {
    return undefined;
  }

  try {
    const rootPageSnap = await storyData.rootPage.get();

    if (!rootPageSnap.exists) {
      return undefined;
    }

    const rootVariantSnap = await storyData.rootPage
      .collection('variants')
      .orderBy('name')
      .limit(1)
      .get();

    return `/p/${rootPageSnap.data().number}${
      rootVariantSnap.docs[0].data().name
    }.html`;
  } catch (error) {
    if (consoleError) {
      consoleError('root page lookup failed', error?.message || error);
    }
    return undefined;
  }
}

/**
 * Determine the owning story reference for the provided page snapshot.
 * @param {{ref?: {parent?: {parent?: any}}}} pageSnap Firestore snapshot describing a page document.
 * @returns {object|null} Story reference when available, otherwise null.
 */
function extractStoryRef(pageSnap) {
  return pageSnap?.ref?.parent?.parent ?? null;
}

/**
 * Derive the author name to display when rendering a variant.
 * @param {Record<string, any>} variant - Variant metadata provided by Firestore.
 * @returns {string} Author name or fallback identifier.
 */
function deriveAuthorName(variant) {
  return variant.authorName || variant.author || '';
}

/**
 * Resolve author metadata for the rendered variant, creating landing pages if needed.
 * @param {{
 *   variant: Record<string, any>,
 *   db: { doc: Function },
 *   bucket: { file: (path: string) => { save: Function, exists: () => Promise<[boolean]> } },
 *   consoleError?: (message?: unknown, ...optionalParams: unknown[]) => void
 * }} root0 - Inputs for author lookup.
 * @returns {Promise<{authorName: string, authorUrl: string | undefined}>} Author metadata for templates.
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
 * @param {{
 *   variant: Record<string, any>,
 *   db: { doc: Function },
 *   bucket: { file: (path: string) => { save: Function, exists: () => Promise<[boolean]> } },
 *   consoleError?: (message?: unknown, ...optionalParams: unknown[]) => void
 * }} root0 - Inputs for creating or reusing an author page.
 * @returns {Promise<string | undefined>} URL of the author page, if one exists.
 */
async function resolveAuthorUrl({ variant, db, bucket, consoleError }) {
  if (!variant.authorId) {
    return undefined;
  }

  return lookupAuthorUrl({ variant, db, bucket, consoleError });
}

/**
 *
 * @param root0
 * @param root0.variant
 * @param root0.db
 * @param root0.bucket
 * @param root0.consoleError
 */
/**
 * Write author page if needed.
 * @param {object} authorFile Author file data.
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
 *
 * @param root0
 * @param root0.variant
 * @param root0.db
 * @param root0.bucket
 * @param root0.consoleError
 */
async function lookupAuthorUrl({ variant, db, bucket, consoleError }) {
  try {
    const authorFile = await resolveAuthorFile({
      variant,
      db,
      bucket,
    });
    return await writeAuthorPageIfNeeded(authorFile, variant);
  } catch (error) {
    if (consoleError) {
      consoleError('author lookup failed', error?.message || error);
    }
    return undefined;
  }
}

/**
 * Resolve a Firestore reference for an author document.
 * @param {{ doc: (path: string) => unknown }} db Firestore-like client.
 * @param {string | undefined} authorId Identifier for the author.
 * @returns {unknown} Firestore document reference for the author path.
 */
function resolveAuthorRef(db, authorId) {
  return db.doc(`authors/${authorId}`);
}

/**
 *
 * @param root0
 * @param root0.variant
 * @param root0.db
 * @param root0.bucket
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
 *
 * @param variant
 * @param file
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
 * @param {object} optionRef Option ref.
 * @returns {object | null} Refs.
 */
function extractParentRefs(optionRef) {
  const parentVariantRef = optionRef.parent?.parent;
  const parentPageRef = parentVariantRef?.parent?.parent;
  return { parentVariantRef, parentPageRef };
}

/**
 * Validate parent refs.
 * @param {object} parentVariantRef Variant ref.
 * @param {object} parentPageRef Page ref.
 * @returns {boolean} True if valid.
 */
function areParentRefsValid(parentVariantRef, parentPageRef) {
  return Boolean(parentVariantRef) && Boolean(parentPageRef);
}

/**
 *
 * @param optionRef
 */
export function resolveParentReferences(optionRef) {
  if (!optionRef) {
    return null;
  }

  const { parentVariantRef, parentPageRef } = extractParentRefs(optionRef);

  if (!areParentRefsValid(parentVariantRef, parentPageRef)) {
    return null;
  }

  return { parentVariantRef, parentPageRef };
}

/**
 * Fetch the parent variant and page documents.
 * @param {{ get: () => Promise<{ exists: boolean }> }} parentVariantRef Firestore-like document reference.
 * @param {{ get: () => Promise<{ exists: boolean }> }} parentPageRef Firestore-like document reference.
 * @returns {Promise<{ parentVariantSnap: { exists: boolean, data: () => Record<string, any> }, parentPageSnap: { exists: boolean, data: () => Record<string, any> } } | null>} Snapshot tuple when both documents exist, otherwise null.
 */
/**
 * Check if snapshots exist.
 * @param {object} parentVariantSnap Variant snap.
 * @param {object} parentPageSnap Page snap.
 * @returns {boolean} True if exist.
 */
function doSnapshotsExist(parentVariantSnap, parentPageSnap) {
  return parentVariantSnap.exists && parentPageSnap.exists;
}

/**
 *
 * @param parentVariantRef
 * @param parentPageRef
 */
async function fetchParentSnapshots(parentVariantRef, parentPageRef) {
  const [parentVariantSnap, parentPageSnap] = await Promise.all([
    parentVariantRef.get(),
    parentPageRef.get(),
  ]);

  if (!doSnapshotsExist(parentVariantSnap, parentPageSnap)) {
    return null;
  }

  return { parentVariantSnap, parentPageSnap };
}

/**
 * Create the parent route slug from snapshot data.
 * @param {{ data: () => Record<string, any> }} parentVariantSnap Variant snapshot.
 * @param {{ data: () => Record<string, any> }} parentPageSnap Page snapshot.
 * @returns {string | null} Route path when identifiers can be derived, otherwise null.
 */
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
 *
 * @param parentVariantSnap
 * @param parentPageSnap
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
 * Determine the canonical URL of the variant's parent, if any.
 * @param {{
 *   variant: Record<string, any>,
 *   db: { doc: (path: string) => { parent?: { parent?: any }, get: Function } },
 *   consoleError: (message?: unknown, ...optionalParams: unknown[]) => void
 * }} options Inputs for parent resolution.
 * @returns {Promise<string | undefined>} URL to the parent variant when it can be resolved.
 */
/**
 * Fetch parent data.
 * @param {object} db Database.
 * @param {string} incomingOption Incoming option.
 * @returns {Promise<object | null>} Parent data.
 */
async function fetchParentData(db, incomingOption) {
  const optionRef = db.doc(incomingOption);
  const references = resolveParentReferences(optionRef);
  if (!references) {
    return null;
  }
  return fetchParentSnapshots(
    references.parentVariantRef,
    references.parentPageRef
  );
}

/**
 * Build route from snapshots.
 * @param {object} snapshots Snapshots.
 * @returns {string | null} Route.
 */
function buildRouteFromSnapshots(snapshots) {
  return buildParentRoute(
    snapshots.parentVariantSnap,
    snapshots.parentPageSnap
  );
}

/**
 *
 * @param root0
 * @param root0.variant
 * @param root0.db
 * @param root0.consoleError
 */
async function resolveParentUrl({ variant, db, consoleError }) {
  if (!variant.incomingOption) {
    return undefined;
  }

  try {
    const snapshots = await fetchParentData(db, variant.incomingOption);
    if (!snapshots) {
      return undefined;
    }

    const route = buildRouteFromSnapshots(snapshots);
    if (route === null) {
      return undefined;
    }

    return route;
  } catch (error) {
    consoleError('parent lookup failed', error?.message || error);
    return undefined;
  }
}

/**
 * Create a renderer that materializes variant HTML and supporting metadata.
 * @param {object} dependencies - External services and configuration values.
 * @param {{doc: Function}} dependencies.db - Firestore-like database used to load related documents.
 * @param {{bucket: (name: string) => { file: (path: string) => { save: Function } }}} dependencies.storage - Cloud storage helper capable of writing files.
 * @param {(url: string, init?: object) => Promise<{ok: boolean, status: number, json: () => Promise<object>}>} dependencies.fetchFn - Fetch implementation used for cache invalidation calls.
 * @param {() => string} dependencies.randomUUID - UUID generator for request identifiers.
 * @param {string} [dependencies.projectId] - Google Cloud project identifier used for cache invalidation.
 * @param {string} [dependencies.urlMapName] - URL map name whose cache should be invalidated.
 * @param {string} [dependencies.cdnHost] - Hostname whose cache entries should be purged.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [dependencies.consoleError] - Logger for recoverable failures.
 * @param {string} [dependencies.bucketName] - Name of the bucket where rendered HTML is written.
 * @param {number} [dependencies.visibilityThreshold] - Minimum visibility used when publishing variants.
 * @returns {(snap: {exists?: boolean, data: () => Record<string, any>, ref: {parent?: {parent?: any}}}, context?: {params?: Record<string, string>}) => Promise<null>} Async renderer for variant snapshots.
 */
export function createRenderVariant({
  db,
  storage,
  fetchFn,
  randomUUID,
  projectId,
  urlMapName,
  cdnHost,
  consoleError = console.error,
  bucketName = DEFAULT_BUCKET_NAME,
  visibilityThreshold = VISIBILITY_THRESHOLD,
}) {
  assertDb(db);
  assertStorage(storage);
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  const bucket = storage.bucket(bucketName);
  const invalidatePaths = createInvalidatePaths({
    fetchFn,
    projectId,
    urlMapName,
    cdnHost,
    randomUUID,
    consoleError,
  });

  /**
   * Execute render workflow.
   * @param {object} deps Dependencies.
   * @param {object} snap Snap.
   * @param {object} context Context.
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

  return async function render(snap, context = {}) {
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
 * @param {object} snap Snap.
 * @returns {boolean} True if valid.
 */
function isSnapValid(snap) {
  if (!snap) return true;
  if (!('exists' in snap)) return true;
  return snap.exists;
}

/**
 * Fetch page data.
 * @param {object} snap Snap.
 * @returns {Promise<object | null>} Page snap.
 */
/**
 * Get page snap from ref.
 * @param {object} snap Snap.
 * @returns {Promise<object | null>} Page snap.
 */
async function getPageSnapFromRef(snap) {
  return snap.ref.parent?.parent?.get();
}

/**
 *
 * @param snap
 */
async function fetchPageData(snap) {
  const pageSnap = await getPageSnapFromRef(snap);
  if (!pageSnap?.exists) {
    return null;
  }
  return pageSnap;
}

/**
 * Gather metadata.
 * @param {object} deps Dependencies.
 * @returns {Promise<object>} Metadata.
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
    visibilityThreshold,
    db,
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
 * @param {object} data Data.
 * @returns {object} Output.
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
    option => option.targetPageNumber === undefined
  );

  return { variant, page, parentUrl, html, filePath, openVariant };
}

/**
 * Fetch and validate page.
 * @param {object} snap Snap.
 * @returns {Promise<object | null>} Page data.
 */
async function fetchAndValidatePage(snap) {
  const pageSnap = await fetchPageData(snap);
  if (!pageSnap) {
    return null;
  }
  return { pageSnap, page: pageSnap.data() };
}

/**
 *
 * @param root0
 * @param root0.snap
 * @param root0.db
 * @param root0.bucket
 * @param root0.consoleError
 * @param root0.visibilityThreshold
 */
async function resolveRenderPlan({
  snap,
  db,
  bucket,
  consoleError,
  visibilityThreshold,
}) {
  if (!isSnapValid(snap)) {
    return null;
  }

  const variant = snap.data();
  const pageData = await fetchAndValidatePage(snap);
  if (!pageData) {
    return null;
  }

  const { pageSnap, page } = pageData;
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
 * @param {object} bucket Bucket.
 * @param {string} filePath File path.
 * @param {string} html HTML.
 * @param {boolean} openVariant Open variant.
 * @returns {Promise<void>} Promise.
 */
async function saveVariantHtml(bucket, filePath, html, openVariant) {
  await bucket.file(filePath).save(html, {
    contentType: 'text/html',
    ...(openVariant && { metadata: { cacheControl: 'no-store' } }),
  });
}

/**
 * Save alts HTML.
 * @param {object} deps Dependencies.
 * @returns {Promise<void>} Promise.
 */
async function saveAltsHtml(deps) {
  const { snap, bucket, page } = deps;
  const variantsSnap = await snap.ref.parent.get();
  const variants = getVisibleVariants(variantsSnap.docs);
  const altsHtml = buildAltsHtml(page.number, variants);
  const altsPath = `p/${page.number}-alts.html`;
  await bucket.file(altsPath).save(altsHtml, { contentType: 'text/html' });
  return altsPath;
}

/**
 * Resolve pending name.
 * @param {object} variant Variant.
 * @param {object} context Context.
 * @returns {string | undefined} Pending name.
 */
function resolvePendingName(variant, context) {
  return variant.incomingOption
    ? context?.params?.variantId
    : context?.params?.storyId;
}

/**
 * Save pending file.
 * @param {object} bucket Bucket.
 * @param {string} pendingName Pending name.
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
 *
 * @param root0
 * @param root0.snap
 * @param root0.context
 * @param root0.bucket
 * @param root0.invalidatePaths
 * @param root0.variant
 * @param root0.page
 * @param root0.parentUrl
 * @param root0.html
 * @param root0.filePath
 * @param root0.openVariant
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
  await saveVariantHtml(bucket, filePath, html, openVariant);
  const altsPath = await saveAltsHtml({ snap, bucket, page });

  const pendingName = resolvePendingName(variant, context);
  await savePendingFile(bucket, pendingName, filePath);

  const paths = buildInvalidationPaths(altsPath, filePath, parentUrl);
  await invalidatePaths(paths);
}

/**
 * Build a change handler that renders visible variants and clears dirty markers.
 * @param {object} options - Dependencies for the change handler.
 * @param {(snap: any, context?: object) => Promise<null>} options.renderVariant - Renderer invoked when a variant should be materialized.
 * @param {() => unknown} options.getDeleteSentinel - Function that produces the sentinel used to clear dirty flags.
 * @param {number} [options.visibilityThreshold] - Minimum visibility required before rendering.
 * @returns {(change: {before: {exists: boolean, data: () => Record<string, any>}, after: {exists: boolean, data: () => Record<string, any>, ref: {update: Function}}}, context?: {params?: Record<string, string>}) => Promise<null>} Firestore change handler.
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
   * @param {object} change Change.
   * @param {object} context Context.
   * @param {Function} renderVariant Render function.
   * @param {Function} getDeleteSentinel Get sentinel.
   * @returns {Promise<null>} Null.
   */
  async function handleDirtyVariant(
    change,
    context,
    renderVariant,
    getDeleteSentinel
  ) {
    await renderVariant(change.after, context);
    await change.after.ref.update({ dirty: getDeleteSentinel() });
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

  return async function handleVariantWrite(change, context) {
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data();

    if (Object.prototype.hasOwnProperty.call(data, 'dirty')) {
      return handleDirtyVariant(
        change,
        context,
        renderVariant,
        getDeleteSentinel
      );
    }

    if (!change.before.exists) {
      return renderVariant(change.after, context);
    }

    const beforeVisibility = change.before.data().visibility;
    const afterVisibility = data.visibility;

    if (
      didCrossVisibilityThreshold(
        beforeVisibility,
        afterVisibility,
        visibilityThreshold
      )
    ) {
      return renderVariant(change.after, context);
    }

    return null;
  };
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
};
