# Atlas portable bundle viewer

The static viewer is available at `/atlas/`. Choose a portable V2, V3, or V4
JSON bundle from the device, then select a mechanism to inspect its bounded
context. Hypotheses, evidence, experiments, relationships, and context warnings
are shown in separate sections. Negative findings remain evidence records, and
relationship records retain their endpoint IDs and polarity across pages.

The browser reads the selected file into memory and validates it with the
existing interpretability schemas. It does not upload the file, call an API,
persist bundle data, or submit research. Circuit snapshot hashes are prepared
with Web Crypto before the synchronous core schema validates the bundle. Bundles
with circuit snapshots require a secure browser context with Web Crypto.

The static copy workflow publishes only the core interpretability modules needed
by the viewer and the installed `zod/v4` runtime under `/vendor/zod/v4/`. The
viewer controller tests inject the schema builder from
`test/core/interpretability/testZod.js`; they do not import or require Zod.

After changing viewer assets or copy paths, run `npm run build` and check that
`public/atlas/index.html`, `public/core/interpretability/interpretability.js`,
and `public/vendor/zod/v4/classic/index.js` exist. Then run `npm run check`.
