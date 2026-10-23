# Atlas portable bundle viewer

The static viewer is available at `/atlas/`. Choose a portable V2, V3, V4, V5, or V6
JSON bundle from the device, then select a mechanism to inspect its bounded
context. Hypotheses, evidence, experiments, relationships, and context warnings
are shown in separate sections. Negative findings remain evidence records, and
relationship records retain their endpoint IDs and polarity across pages.

The browser reads the selected file into memory and validates it with the
existing interpretability schemas. It does not upload the file, call an API,
persist bundle data, or submit research. Circuit snapshot hashes are prepared
with Web Crypto before the synchronous core schema validates the bundle. Bundles
with circuit snapshots require a secure browser context with Web Crypto.

V5 adds attributable identity-reference claims. V6 embeds these claims in a V3
identity graph and permits an unindexed target only when an exact typed claim
is attached to the record that names it. Existing targets continue to receive
canonical coordinate, checkpoint, and snapshot checks, and V2 graphs remain
strict. The V1 research service accepts claims through `submitIdentityReference`
and exposes their derived states through `readIdentityReferences`. V2–V5
bundles remain importable; subsequent service writes use V6. See
[`atlas-identity-references.md`](atlas-identity-references.md) for the format.

The static copy workflow publishes only the core interpretability modules needed
by the viewer and the installed `zod/v4` runtime under `/vendor/zod/v4/`. The
viewer controller tests inject the schema builder from
`test/core/interpretability/testZod.js`; they do not import or require Zod.

After changing viewer assets or copy paths, run `npm run build` and check that
`public/atlas/index.html`, `public/core/interpretability/interpretability.js`,
and `public/vendor/zod/v4/classic/index.js` exist. Then run `npm run check`.
