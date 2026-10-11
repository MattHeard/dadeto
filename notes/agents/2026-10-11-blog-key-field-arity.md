# Blog-key field builder arity cleanup

- Unexpected hurdle: the source scanner counted nested parameter records as effective arity; keeping both field and form context while moving data into a third input was required to clarify the actual inputs.
- Diagnosis: field configuration, DOM/form wiring, and mutable BlogKeyData are independent responsibilities. The prior context mixed form wiring with model state, while each field record redundantly carried the DOM helper.
- Fix: `buildBlogKeyField` now accepts a field definition, form context, and mutable model separately. Removed redundant `dom` from field definitions; input updates still mutate the model before serializing to the hidden input.
- Evidence: scoped no-cache arity report `.tmp/blog-key-arity-after.json` is empty; focused handler and mutation tests passed (2 suites, 26 tests); TSDoc/lint passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global inventory `.tmp/parameter-bag-global-after-blog-key.json` reports 34 findings across 34 files, down from 35/35.
- Next time: keep mutable model state distinct from form-control wiring. Next target is `src/core/browser/inputHandlers/captureFormShared.js:145`.
