## 2026-05-29 Check Tightening

The latest `npm run check` run exposed two tsdoc errors in the render helpers after I removed a dead `objectPrefix ?? ''` fallback. The diagnosis was that the prefix is already normalized upstream, so the fallback was both redundant and the source of the branch noise.

Fix: cast the normalized `objectPrefix` at the point of use in `render-contents-core.js` and `render-variant-core.js` instead of reintroducing a nullish fallback. That keeps tsdoc happy without reopening the branch-coverage gap.

Next time: when a checker complains about an optional value that is already normalized earlier in the call chain, prefer a local cast or a tighter typedef over adding another fallback branch.
