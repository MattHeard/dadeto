# Chrome Veil squash

- Surviving mutant: `Chrome Veil` / mutant `86` in `src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js:465`.
- Diagnosis: the mutant hit `isValidMarkRequest({ pageNumber, variantName })`, which is a real validation gate in the public request pipeline. The branch is reachable because `parseMarkVariantRequestBody()` can normalize an empty or missing variant into `''`, and the validator is supposed to reject that case.
- Cleanup performed: added a unit test that sends `variant: ''` through `createHandleRequest(...)` and asserts the handler returns `400` with `Invalid input` without calling `markVariantDirty`.
- Validation: reran the full project test suite successfully after adding the test.
- Takeaway: when a mutant lands in request validation rather than boundary normalization, prefer an explicit branch test that proves the malformed input is rejected through the public handler path.
