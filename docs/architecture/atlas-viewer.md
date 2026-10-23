# Atlas portable bundle viewer

The static viewer is available at `/atlas/`. Choose a portable V2, V3, V4, or V5
JSON bundle from the device, then select a mechanism to inspect its bounded
context. Hypotheses, evidence, experiments, relationships, and context warnings
are shown in separate sections. Negative findings remain evidence records, and
relationship records retain their endpoint IDs and polarity across pages.

The browser reads the selected file into memory and validates it with the
existing interpretability schemas. It does not upload the file, call an API,
persist bundle data, or submit research. Circuit snapshot hashes are prepared
with Web Crypto before the synchronous core schema validates the bundle. Bundles
with circuit snapshots require a secure browser context with Web Crypto.

V5 adds attributable identity-reference claims for entities that have not been
indexed yet. Claims keep the original typed entity ID, author, source, source
record, and timestamp. A later claim may supply a structured identity
descriptor; the service then reports the reference as resolved when one
distinct descriptor exists, or as a conflict when incompatible descriptors
exist. The V1 research service accepts these claims through
`submitIdentityReference` and exposes their derived states through
`readIdentityReferences`. Older V2–V4 bundles import with an empty reference
collection, and subsequent service writes export V5 while retaining their
existing evidence and identity records. See
[`atlas-identity-references.md`](atlas-identity-references.md) for the current
format and remaining graph-link work.

The static copy workflow publishes only the core interpretability modules needed
by the viewer and the installed `zod/v4` runtime under `/vendor/zod/v4/`. The
viewer controller tests inject the schema builder from
`test/core/interpretability/testZod.js`; they do not import or require Zod.

After changing viewer assets or copy paths, run `npm run build` and check that
`public/atlas/index.html`, `public/core/interpretability/interpretability.js`,
and `public/vendor/zod/v4/classic/index.js` exist. Then run `npm run check`.
