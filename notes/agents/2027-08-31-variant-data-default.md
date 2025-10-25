## Context
Jest highlighted that `createRemoveVariantHtml` now forwarded `variantData: null` when neither the payload nor the load result supplied variant details. The spec expects `undefined` in that scenario.

## Challenge
Because the helper defaulted `variantData` to `null`, the tests failed and it risked downstream assumptions that distinguish between "unset" and "explicitly cleared" variant data.

## Resolution
Adjusted the helper to only substitute the loader's `variant` output when the payload omits the field, preserving `undefined` otherwise. This restored the contract and the test suite now passes.
