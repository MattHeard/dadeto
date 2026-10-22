import { z } from '/vendor/zod/v4/classic/index.js';
import { createAtlasPageController } from '/core/browser/atlas/page.js';
import { createAtlasSchemaResolver } from '/core/browser/atlas/schemaAdapter.js';

const hashCanonicalIdentity = async canonicalIdentity => {
  const bytes = new TextEncoder().encode(canonicalIdentity);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
};

const handle = createAtlasPageController({
  documentObj: document,
  resolveSchemas: createAtlasSchemaResolver({ z, hashCanonicalIdentity }),
});

handle.start();
