# jscpd clone buckets

## Checklist

- [x] `NEON-MIRROR` - common normalization and fallback helpers
- [ ] `BLACKWIRE` - browser, cloud, and presenter lifecycle helpers
- [ ] `NEON-DRIFT` - browser helper singularities
- [ ] `VOID-STATIC` - cloud helper singularities
- [ ] `CORE-PRISM` - shared core/local helper singularities
- [ ] `ASH-LOOP` - leftovers that do not fit the main bundles

## Notes

- The `NEON-MIRROR` bucket was the first coherent slice and was resolved by reusing existing common helpers instead of keeping local string and number normalization wrappers.
- `BLACKWIRE` is the current broad follow-up bucket and should be split into smaller browser, cloud, and presenter helper passes before final cleanup.
- The remaining buckets are broader bundles and should be split further before attempting more refactors.
