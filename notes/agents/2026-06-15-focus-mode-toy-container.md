# Focus mode toy container — 2026-06-15

- **Unexpected hurdle:** The new focus toggle was functionally correct, but it broke generator snapshot and mutant tests that hard-coded the old submit-only button block.
- **Diagnosis path:** Ran the full test suite, inspected the failing generator expectations, and updated the exact HTML/button-section strings everywhere they were asserted.
- **Chosen fix:** Added a toggle button that expands the toy container to viewport width/height while keeping it scrollable, wired the click handler in the browser bootstrap, and updated shared styles plus generated assets.
- **Next-time guidance:** When changing generator markup, update the exact snapshot-style tests and mutant guards in the same loop so the first full-suite run can go green without a second pass.
