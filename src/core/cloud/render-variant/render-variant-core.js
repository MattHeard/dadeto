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

/**
 *
 * @param text
 */
function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  return html;
}

/**
 *
 * @param pageNumber
 * @param variantName
 * @param option
 */
function buildOptionItem(pageNumber, variantName, option) {
  const slug = `${pageNumber}-${variantName}-${option.position}`;
  let href = `../new-page.html?option=${slug}`;
  if (option.targetPageNumber !== undefined) {
    const suffix = option.targetVariantName || '';
    href = `/p/${option.targetPageNumber}${suffix}.html`;
  }
  const optionHtml = renderInlineMarkdown(option.content);
  const attrs = [
    'class="variant-link"',
    `data-link-id="${slug}"`,
    `href="${href}"`,
  ];
  if (option.targetVariants) {
    const variantsAttr = option.targetVariants
      .map(v => `${option.targetPageNumber}${v.name}:${v.weight}`)
      .join(',');
    attrs.push(`data-variants="${escapeHtml(variantsAttr)}"`);
  }
  return `<li><a ${attrs.join(' ')}>${optionHtml}</a></li>`;
}

/**
 *
 * @param pageNumber
 * @param variantName
 * @param options
 */
function buildOptionsHtml(pageNumber, variantName, options) {
  return options
    .map(option => buildOptionItem(pageNumber, variantName, option))
    .join('');
}

/**
 *
 * @param storyTitle
 * @param showTitleHeading
 */
function buildTitleHeadingHtml(storyTitle, showTitleHeading) {
  if (!storyTitle || !showTitleHeading) return '';
  return `<h1>${escapeHtml(storyTitle)}</h1>`;
}

/**
 *
 * @param storyTitle
 */
function buildHeadTitle(storyTitle) {
  if (storyTitle) {
    return `Dendrite - ${escapeHtml(storyTitle)}`;
  }
  return 'Dendrite';
}

/**
 *
 * @param author
 * @param authorUrl
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
 * @param url
 * @param label
 */
function buildLinkParagraph(url, label) {
  if (!url) return '';
  return `<p><a href="${url}">${label}</a></p>`;
}

/**
 *
 * @param pageNumber
 */
function buildRewriteLink(pageNumber) {
  return `<a href="../new-page.html?page=${pageNumber}">Rewrite</a> `;
}

/**
 *
 * @param pageNumber
 * @param variantName
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
 * @param pageNumber
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
 * @param content
 */
function buildParagraphsHtml(content) {
  return content
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => `<p>${renderInlineMarkdown(line)}</p>`)
    .join('');
}

/**
 *
 * @param pageNumber
 * @param variantName
 * @param content
 * @param options
 * @param storyTitle
 * @param author
 * @param authorUrl
 * @param parentUrl
 * @param firstPageUrl
 * @param showTitleHeading
 */
export function buildHtml(
  pageNumber,
  variantName,
  content,
  options,
  storyTitle = '',
  author = '',
  authorUrl = '',
  parentUrl = '',
  firstPageUrl = '',
  showTitleHeading = true
) {
  const items = buildOptionsHtml(pageNumber, variantName, options);
  const title = buildTitleHeadingHtml(storyTitle, showTitleHeading);
  const headTitle = buildHeadTitle(storyTitle);
  const authorHtml = buildAuthorHtml(author, authorUrl);
  const parentHtml = buildLinkParagraph(parentUrl, 'Back');
  const firstHtml = buildLinkParagraph(firstPageUrl, 'First page');
  const rewriteLink = buildRewriteLink(pageNumber);
  const reportHtml = buildReportHtml(pageNumber, variantName);
  const pageNumberHtml = buildPageNumberHtml(pageNumber);
  const paragraphs = buildParagraphsHtml(content);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${headTitle}</title>
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
        <a href="/about.html">About</a>
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
    <main>${title}${paragraphs}<ol>${items}</ol>${authorHtml}${parentHtml}${firstHtml}<p>${rewriteLink}<a href="./${pageNumber}-alts.html">Other variants</a></p>${pageNumberHtml}${reportHtml}</main>
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
        toggle.addEventListener('click', () =>
          overlay.hidden ? openMenu() : closeMenu()
        );
        closeBtn.addEventListener('click', closeMenu);
        overlay.addEventListener('click', e => {
          if (e.target === overlay) closeMenu();
        });
        addEventListener('keydown', e => {
          if (e.key === 'Escape' && !overlay.hidden) closeMenu();
        });
      })();
    </script>
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
  </body>
</html>`;
}

/**
 *
 * @param pageNumber
 * @param variants
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
        toggle.addEventListener('click', () =>
          overlay.hidden ? openMenu() : closeMenu()
        );
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
 * @param docs
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
    const url = `https://compute.googleapis.com/compute/v1/projects/${
      projectId || ''
    }/global/urlMaps/${urlMap}/invalidateCache`;

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
 * @param {{doc: Function}} options.db - Firestore-like database used for lookups.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} options.consoleError - Logger for recoverable failures.
 * @returns {Promise<object>} Metadata describing the option suitable for HTML rendering.
 */
async function buildOptionMetadata({
  data,
  visibilityThreshold,
  db,
  consoleError,
}) {
  let targetPageNumber;
  let targetVariantName;
  let targetVariants;

  if (data.targetPage) {
    try {
      const targetSnap = await data.targetPage.get();

      if (targetSnap.exists) {
        targetPageNumber = targetSnap.data().number;
        const variantSnap = await data.targetPage
          .collection('variants')
          .orderBy('name')
          .get();
        const visible = variantSnap.docs.filter(
          doc => (doc.data().visibility ?? 1) >= visibilityThreshold
        );

        if (visible.length) {
          targetVariantName = visible[0].data().name;
          targetVariants = visible.map(doc => ({
            name: doc.data().name,
            weight: doc.data().visibility ?? 1,
          }));
        }
      }
    } catch (error) {
      consoleError('target page lookup failed', error?.message || error);
    }
  } else if (data.targetPageNumber !== undefined) {
    targetPageNumber = data.targetPageNumber;
  }

  return {
    content: data.content,
    position: data.position,
    ...(targetPageNumber !== undefined && { targetPageNumber }),
    ...(targetVariantName && { targetVariantName }),
    ...(targetVariants && { targetVariants }),
  };
}

/**
 * Load and normalize option documents for a particular variant.
 * @param {object} options - Dependencies required to load options.
 * @param {{ref: {collection: Function}}} options.snap - Firestore snapshot for the variant whose options are being read.
 * @param {number} options.visibilityThreshold - Minimum visibility required for inclusion.
 * @param {{doc: Function}} options.db - Firestore-like database for nested lookups.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<object[]>} Ordered option metadata entries.
 */
async function loadOptions({ snap, visibilityThreshold, db, consoleError }) {
  const optionsSnap = await snap.ref.collection('options').get();
  const optionsData = optionsSnap.docs.map(doc => doc.data());
  optionsData.sort((a, b) => a.position - b.position);

  return Promise.all(
    optionsData.map(data =>
      buildOptionMetadata({
        data,
        visibilityThreshold,
        db,
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
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<{storyTitle: string, firstPageUrl: string | undefined}>} Story metadata used in templates.
 */
async function resolveStoryMetadata({ pageSnap, page, consoleError }) {
  const storyRef = pageSnap.ref.parent?.parent;

  if (!storyRef) {
    return { storyTitle: '', firstPageUrl: undefined };
  }

  const storySnap = await storyRef.get();

  if (!storySnap.exists) {
    return { storyTitle: '', firstPageUrl: undefined };
  }

  const storyData = storySnap.data();
  const storyTitle = storyData.title || '';
  let firstPageUrl;

  if (page.incomingOption && storyData.rootPage) {
    try {
      const rootPageSnap = await storyData.rootPage.get();

      if (rootPageSnap.exists) {
        const rootVariantSnap = await storyData.rootPage
          .collection('variants')
          .orderBy('name')
          .limit(1)
          .get();

        if (!rootVariantSnap.empty) {
          firstPageUrl = `/p/${rootPageSnap.data().number}${
            rootVariantSnap.docs[0].data().name
          }.html`;
        }
      }
    } catch (error) {
      if (consoleError) {
        consoleError('root page lookup failed', error?.message || error);
      }
    }
  }

  return { storyTitle, firstPageUrl };
}

/**
 * Resolve author metadata for the rendered variant, creating landing pages if needed.
 * @param {object} options - Inputs for author lookup.
 * @param {Record<string, any>} options.variant - Variant data being rendered.
 * @param {{doc: Function}} options.db - Firestore-like database used to load author documents.
 * @param {{file: (path: string) => { save: Function, exists: () => Promise<[boolean]> }}} options.bucket - Bucket handle used to read/write author HTML.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<{authorName: string, authorUrl: string | undefined}>} Author metadata for templates.
 */
async function resolveAuthorMetadata({ variant, db, bucket, consoleError }) {
  const authorName = variant.authorName || variant.author || '';

  if (!variant.authorId || !authorName) {
    return { authorName, authorUrl: undefined };
  }

  try {
    const authorRef = db.doc(`authors/${variant.authorId}`);
    const authorSnap = await authorRef.get();

    if (!authorSnap.exists) {
      return { authorName, authorUrl: undefined };
    }

    const { uuid } = authorSnap.data() || {};

    if (!uuid) {
      return { authorName, authorUrl: undefined };
    }

    const authorPath = `a/${uuid}.html`;
    const file = bucket.file(authorPath);
    const [exists] = await file.exists();

    if (!exists) {
      const authorHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite - ${escapeHtml(
        authorName
      )}</title><link rel="icon" href="/favicon.ico" /><link rel="stylesheet" href="/dendrite.css" /></head><body><main><h1>${escapeHtml(
        authorName
      )}</h1></main></body></html>`;
      await file.save(authorHtml, { contentType: 'text/html' });
    }

    return { authorName, authorUrl: `/${authorPath}` };
  } catch (error) {
    if (consoleError) {
      consoleError('author lookup failed', error?.message || error);
    }

    return { authorName, authorUrl: undefined };
  }
}

/**
 * Resolve parent document references for the variant hierarchy.
 * @param {{ parent?: { parent?: any } } | null | undefined} optionRef Reference to the incoming option document.
 * @returns {{ parentVariantRef: { get: Function, parent?: { parent?: any } }, parentPageRef: { get: Function } } | null} Parent
 * references when the hierarchy can be resolved, otherwise null.
 */
function resolveParentReferences(optionRef) {
  if (!optionRef) {
    return null;
  }

  const parentVariantRef = optionRef.parent?.parent;
  const parentPageRef = parentVariantRef?.parent?.parent;

  if (!parentVariantRef || !parentPageRef) {
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
async function fetchParentSnapshots(parentVariantRef, parentPageRef) {
  const [parentVariantSnap, parentPageSnap] = await Promise.all([
    parentVariantRef.get(),
    parentPageRef.get(),
  ]);

  if (!parentVariantSnap.exists || !parentPageSnap.exists) {
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
function buildParentRoute(parentVariantSnap, parentPageSnap) {
  const parentData = parentVariantSnap.data() || {};
  const pageData = parentPageSnap.data() || {};
  const parentName = parentData.name;
  const parentNumber = pageData.number;

  if (!parentName || parentNumber === undefined) {
    return null;
  }

  return `/p/${parentNumber}${parentName}.html`;
}

/**
 * Determine the canonical URL of the variant's parent, if any.
 * @param {{
 *   variant: Record<string, any>,
 *   db: { doc: (path: string) => { parent?: { parent?: any }, get: Function } },
 *   consoleError?: (message?: unknown, ...optionalParams: unknown[]) => void
 * }} options Inputs for parent resolution.
 * @returns {Promise<string | undefined>} URL to the parent variant when it can be resolved.
 */
async function resolveParentUrl({ variant, db, consoleError }) {
  if (!variant.incomingOption) {
    return undefined;
  }

  try {
    const optionRef = db.doc(variant.incomingOption);
    const references = resolveParentReferences(optionRef);

    if (!references) {
      return undefined;
    }

    const snapshots = await fetchParentSnapshots(
      references.parentVariantRef,
      references.parentPageRef
    );

    if (!snapshots) {
      return undefined;
    }

    const route = buildParentRoute(
      snapshots.parentVariantSnap,
      snapshots.parentPageSnap
    );

    if (route === null) {
      return undefined;
    }

    return route;
  } catch (error) {
    if (consoleError) {
      consoleError('parent lookup failed', error?.message || error);
    }

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

  return async function render(snap, context = {}) {
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
async function resolveRenderPlan({
  snap,
  db,
  bucket,
  consoleError,
  visibilityThreshold,
}) {
  if (snap && 'exists' in snap && !snap.exists) {
    return null;
  }

  const variant = snap.data() || {};
  const pageSnap = await snap.ref.parent?.parent?.get();

  if (!pageSnap?.exists) {
    return null;
  }

  const page = pageSnap.data() || {};
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

  const html = buildHtml(
    page.number,
    variant.name,
    variant.content,
    options,
    storyTitle,
    authorName,
    authorUrl,
    parentUrl,
    firstPageUrl,
    !page.incomingOption
  );
  const filePath = `p/${page.number}${variant.name}.html`;
  const openVariant = options.some(
    option => option.targetPageNumber === undefined
  );

  return { variant, page, parentUrl, html, filePath, openVariant };
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
  await bucket.file(filePath).save(html, {
    contentType: 'text/html',
    ...(openVariant && { metadata: { cacheControl: 'no-store' } }),
  });

  const variantsSnap = await snap.ref.parent.get();
  const variants = getVisibleVariants(variantsSnap.docs);
  const altsHtml = buildAltsHtml(page.number, variants);
  const altsPath = `p/${page.number}-alts.html`;

  await bucket.file(altsPath).save(altsHtml, { contentType: 'text/html' });

  const pendingName = variant.incomingOption
    ? context?.params?.variantId
    : context?.params?.storyId;
  const pendingPath = `pending/${pendingName}.json`;

  await bucket.file(pendingPath).save(JSON.stringify({ path: filePath }), {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-store' },
  });

  const paths = [`/${altsPath}`, `/${filePath}`];

  if (parentUrl) {
    paths.push(parentUrl);
  }

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

  return async function handleVariantWrite(change, context = {}) {
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data() || {};

    if (Object.prototype.hasOwnProperty.call(data, 'dirty')) {
      await renderVariant(change.after, context);
      await change.after.ref.update({ dirty: getDeleteSentinel() });
      return null;
    }

    if (!change.before.exists) {
      return renderVariant(change.after, context);
    }

    const beforeVisibility = change.before.data().visibility ?? 0;
    const afterVisibility = data.visibility ?? 0;

    if (
      beforeVisibility < visibilityThreshold &&
      afterVisibility >= visibilityThreshold
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
  resolveAuthorMetadata,
  resolveParentReferences,
  fetchParentSnapshots,
  buildParentRoute,
  resolveParentUrl,
  resolveRenderPlan,
};
