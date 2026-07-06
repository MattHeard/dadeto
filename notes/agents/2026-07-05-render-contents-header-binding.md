# 2026-07-05: render-contents header binding

- Unexpected hurdle: the prod crash was an unbound `req.get` call in the render-contents CORS/authorization path, but the repo check kept failing on a separate function-coverage baseline issue in `src/core/commonCore.js:isValidString`.
- Diagnosis path: confirmed the Cloud Logging stack trace pointed at `resolveOriginHeader` / `getAuthorizationHeaderFromGetter`, patched those helpers to preserve the request receiver, then reran the full check and used the coverage JSON to isolate the remaining zero-hit function.
- Chosen fix: bind `req.get` with `Function.prototype.call` in the render-contents helper path and add regression tests for receiver-bound request getters.
- Next-time guidance: if `npm run check` still reports a single zero-hit helper after a local fix, inspect `reports/coverage/coverage-final.json` directly and avoid widening the patch until the exact uncovered function is proven relevant to the changed slice.
