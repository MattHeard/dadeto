import { escapeHtml } from './buildAltsHtml.js';

/**
 * Render inline markdown for bold and italics.
 * @param {string} text Text to render.
 * @returns {string} HTML string.
 */
function renderInlineMarkdown(text) {
  let html = escapeHtml(String(text ?? ''));
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  return html;
}

/**
 * Build HTML page for the variant.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {string} content Variant content.
 * @param {Array<{
 *   content: string,
 *   position: number,
 *   targetPageNumber?: number,
 * }>} options Option info.
 * @param {string} [storyTitle] Story title.
 * @param {string} [author] Author name.
 * @param parentUrl
 * @param firstPageUrl
 * @returns {string} HTML page.
 */
export function buildHtml(
  pageNumber,
  variantName,
  content,
  options,
  storyTitle = '',
  author = '',
  parentUrl = '',
  firstPageUrl = ''
) {
  const items = options
    .map(opt => {
      const slug = `${pageNumber}-${variantName}-${opt.position}`;
      const href =
        opt.targetPageNumber !== undefined
          ? `/p/${opt.targetPageNumber}${opt.targetVariantName || ''}.html`
          : `../new-page.html?option=${slug}`;
      const optionHtml = renderInlineMarkdown(opt.content);
      const attrs = [
        'class="variant-link"',
        `data-link-id="${slug}"`,
        `href="${href}"`,
      ];
      if (opt.targetVariants) {
        const variantsAttr = opt.targetVariants
          .map(v => `${opt.targetPageNumber}${v.name}:${v.weight ?? 1}`)
          .join(',');
        attrs.push(`data-variants="${escapeHtml(variantsAttr)}"`);
      }
      return `<li><a ${attrs.join(' ')}>${optionHtml}</a></li>`;
    })
    .join('');
  const title = storyTitle ? `<h1>${escapeHtml(storyTitle)}</h1>` : '';
  const headTitle = storyTitle
    ? `Dendrite - ${escapeHtml(storyTitle)}`
    : 'Dendrite';
  const authorHtml = author ? `<p>By ${escapeHtml(author)}</p>` : '';
  const parentHtml = parentUrl ? `<p><a href="${parentUrl}">Back</a></p>` : '';
  const firstHtml = firstPageUrl
    ? `<p><a href="${firstPageUrl}">First page</a></p>`
    : '';
  const rewriteLink = `<a href="../new-page.html?page=${pageNumber}">Rewrite</a> `;
  const variantSlug = `${pageNumber}${variantName}`;
  const reportHtml =
    '<p><a id="reportLink" href="#">⚑ Report</a></p>' +
    `<script>document.getElementById('reportLink').onclick=async e=>{e.preventDefault();try{await fetch('https://europe-west1-irien-465710.cloudfunctions.net/prod-report-for-moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:'${variantSlug}'})});alert('Thanks for your report.');}catch(e){alert('Sorry, something went wrong.');}};</script>`;
  const pageNumberHtml =
    `<p style="text-align:center">` +
    `<a style="text-decoration:none" href="/p/${pageNumber - 1}a.html">◀</a> ` +
    `${pageNumber} ` +
    `<a style="text-decoration:none" href="/p/${pageNumber + 1}a.html">▶</a>` +
    `</p>`;
  const paragraphs = String(content ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => `<p>${renderInlineMarkdown(line)}</p>`)
    .join('');
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
            <a id="adminLink" href="/admin.html" style="display:none">Admin</a>
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
      const al = document.getElementById('adminLink');
      const sbs = document.querySelectorAll('#signinButton');
      const sws = document.querySelectorAll('#signoutWrap');
      const sos = document.querySelectorAll('#signoutLink');
      function showSignedIn() {
        sbs.forEach(el => (el.style.display = 'none'));
        sws.forEach(el => (el.style.display = ''));
        if (isAdmin()) al.style.display = '';
      }
      function showSignedOut() {
        sbs.forEach(el => (el.style.display = ''));
        sws.forEach(el => (el.style.display = 'none'));
        if (al) al.style.display = 'none';
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
            const linkId = a.getAttribute('data-link-id');
            if (linkId && !chosenUrl.searchParams.has('from')) {
              chosenUrl.searchParams.set('from', linkId);
              chosenUrl.searchParams.set('to', chosen);
            }
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
