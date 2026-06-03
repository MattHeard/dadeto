import { createVariantRedirectHandle } from '../core/browser/variant-redirect.js';

const handle = createVariantRedirectHandle({
  documentObj: document,
  locationObj: location,
  cryptoObj: crypto,
  URLCtor: URL,
});

handle();
