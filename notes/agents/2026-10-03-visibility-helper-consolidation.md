# Visibility helper consolidation

Replaced identical page/story ancestor lookups with one private `getParentDocumentRef`. Removed `calculateNextVisibilityForPayload`, whose nullish fallback was redundant because the public callee already uses `variantData || {}`. No public exports changed. Missing references, missing variant data, weighted ratings, and admin locks retain their existing behavior.

Focused evidence: `.tmp/visibility-helper-consolidation-tests.log`, 36 tests pass with exact 100% coverage in all four metrics for the visibility core. Static evidence: `.tmp/visibility-helper-consolidation-static.log`, nine gates pass and duplication alone fails at 111 clones (down from 113). Parent goal remains open; no ignores or threshold changes.
