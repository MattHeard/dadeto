(function () {
  /**
   *
   * @param pairs
   */
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

  /**
   *
   * @param attr
   */
  function parseVariants(attr) {
    if (!attr) return [];
    const trimmed = attr.trim();
    if (!trimmed) return [];
    if (trimmed[0] === '[' || trimmed[0] === '{') {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) return arr.map(x => ({ slug: x.slug, w: x.w }));
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

  /**
   *
   * @param a
   */
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
      parts[parts.length - 1] = `${chosen}.html`;
      chosenUrl.pathname = parts.join('/');
      a.setAttribute('href', chosenUrl.toString());
      a.setAttribute('data-chosen-variant', chosen);
    } catch {}
  }

  /**
   *
   */
  function init() {
    const links = document.querySelectorAll('a.variant-link[data-variants]');
    links.forEach(rewriteLink);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
