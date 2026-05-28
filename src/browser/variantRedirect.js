(function () {
  function pickWeighted(pairs) {
    let total = 0;
    for (const pair of pairs) {
      const weight = Number(pair.w);
      if (Number.isFinite(weight) && weight > 0) total += weight;
    }
    if (total <= 0) return null;
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    let threshold = ((random[0] + 1) / 4294967297) * total;
    for (const pair of pairs) {
      const weight = Number(pair.w);
      if (!Number.isFinite(weight) || weight <= 0) continue;
      threshold -= weight;
      if (threshold <= 0) return pair.slug;
    }
    return pairs.at(-1)?.slug ?? null;
  }
  function parseVariants(attr) {
    if (!attr) return [];
    const trimmed = attr.trim();
    if (!trimmed) return [];
    if (trimmed[0] === '[' || trimmed[0] === '{') {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map(item => ({ slug: item.slug, w: item.w })) : [];
      } catch { return []; }
    }
    return trimmed.split(',').map(pair => { const [slug, weight] = pair.split(':'); return { slug: slug?.trim(), w: Number(weight ?? 1) }; }).filter(pair => pair.slug);
  }
  function rewriteLink(link) {
    const pairs = parseVariants(link.getAttribute('data-variants'));
    const chosen = pairs.length ? pickWeighted(pairs) : null;
    if (!chosen) return;
    try {
      const url = new URL(link.getAttribute('href', 2), location.href);
      const parts = url.pathname.split('/');
      parts[parts.length - 1] = `${chosen}.html`;
      url.pathname = parts.join('/');
      link.setAttribute('href', url.toString());
      link.setAttribute('data-chosen-variant', chosen);
    } catch {}
  }
  const init = () => document.querySelectorAll('a.variant-link[data-variants]').forEach(rewriteLink);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
