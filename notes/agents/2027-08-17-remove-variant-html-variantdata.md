# Remove variant HTML variant data fallback

## Challenges
- Running the Jest suite revealed `createRemoveVariantHtml` passed `null` for `variantData` when no data was supplied, conflicting with the test's expectation of `undefined`.
- ESLint reported a `no-ternary` warning for the fallback logic in `createRemoveVariantHtml`, which needed to be resolved without disabling the rule.

## Resolutions
- Added an explicit check for whether the payload supplied `variantData` before reading loader results, keeping the value `undefined` when neither source provides data.
- Replaced the ternary operator used to initialize the resolved variant data with an equivalent `if` block, satisfying the lint rule while preserving behavior.
