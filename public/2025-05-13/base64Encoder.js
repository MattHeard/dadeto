// Toy: Base64 Encoder
// (string input, env) -> string (Base64 encoded)

export function encodeBase64(input, env) {
  const text = typeof input === 'string' ? input : String(input ?? '');

  // ── Injected dependencies ────────────────────────────────────────────────────
  const {
    bufferFrom, // Node.js: txt => Buffer.from(txt, 'utf8')
    btoa: btoaFn, // Browser: window.btoa
    encodeURIComponent: encodeURIComponentFn = (
      typeof encodeURIComponent === 'function' ? encodeURIComponent : (s) => s
    ),
    unescape: unescapeFn = (
      typeof unescape === 'function' ? unescape : (s) => s
    )
  } = env || {};
  // ─────────────────────────────────────────────────────────────────────────────

  // 1️⃣ Node‑style implementation via Buffer
  if (typeof bufferFrom === 'function') {
    const buf = bufferFrom(text);
    if (buf && typeof buf.toString === 'function') {
      return buf.toString('base64');
    }
  }

  // 2️⃣ Browser‑style implementation via btoa
  if (typeof btoaFn === 'function') {
    return btoaFn(unescapeFn(encodeURIComponentFn(text)));
  }

  // 3️⃣ Manual fallback: UTF‑8 encode + custom Base64 algorithm
  const base64chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;

  const utf8 = encodeURIComponentFn(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );

  while (i < utf8.length) {
    const c1 = utf8.charCodeAt(i++);
    const c2 = i < utf8.length ? utf8.charCodeAt(i++) : NaN;
    const c3 = i < utf8.length ? utf8.charCodeAt(i++) : NaN;

    const enc1 = c1 >> 2;
    const enc2 = ((c1 & 0x03) << 4) | (c2 >> 4);
    const enc3 = isNaN(c2) ? 64 : ((c2 & 0x0f) << 2) | (c3 >> 6);
    const enc4 = isNaN(c3) ? 64 : c3 & 0x3f;

    output +=
      base64chars.charAt(enc1) +
      base64chars.charAt(enc2) +
      base64chars.charAt(enc3) +
      base64chars.charAt(enc4);
  }

  return output;
}
