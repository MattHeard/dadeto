Unexpected hurdle: the browser presenter core looked like it still had statement debt, but the existing tests already covered most of the logic; only the JSON presenter fallback branch was missing.

Diagnosis path: I verified the source, found the shared presenter-core test file, and reran the focused coverage slice to confirm `createParsedJsonPresenter()` was the remaining gap.

Chosen fix: added one assertion that exercises invalid JSON through `createParsedJsonPresenter()` and returns the fallback `<pre>` output.

Next-time guidance: check the focused coverage slice before expanding test scaffolding; this file was a small patch, not a larger rewrite.
