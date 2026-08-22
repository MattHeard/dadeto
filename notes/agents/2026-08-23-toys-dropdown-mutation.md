# Toys dropdown mutation slice

The bounded `src/core/browser/toys.js` lines 186-296 scan initially left two non-static survivors in the `ensureKeyValueInput` renderer configuration. The missing behavioral contract was disposer cleanup: tests exercised rendering but did not dispose the returned key/value input. Adding cleanup assertions and the missing DOM `removeEventListener` test-double method killed both survivors. The final bounded scan instrumented 21 mutants: 20 killed, 1 static-ignored, 0 non-static survivors, and 0 timeouts; focused Jest verification passed 53 tests. The full-file `toys.js` scan remains pending.

The follow-up lines 302-448 scan initially exposed weak coverage around select wrapping, output fallback, and both focus-mode branches. Exact selector, presenter content, missing-parent, missing-output, and container/no-container assertions killed the remaining mutants. The final bounded scan instrumented 60 mutants: 47 killed, 0 non-static survivors, and 0 timeouts; focused Jest verification passed 29 tests. The full-file `toys.js` scan remains pending.

The lines 450-679 module/output/intersection scan instrumented 36 mutants: 34 killed, 0 non-static survivors, and 0 timeouts. The existing 93-test focused dry run covered module initialization, observer callbacks, configuration mapping, module errors, and control enabling. The full-file `toys.js` scan remains pending.

The lines 680-736 fetch/output-helper scan instrumented 10 mutants: 8 killed, 0 non-static survivors, and 0 timeouts. Two mutation-induced runtime errors crashed Stryker workers in rejected-promise paths, so they are recorded as crash evidence rather than survivors. The lines 738-850 scan instrumented 38 mutants: 29 killed, 0 non-static survivors, and 0 timeouts across 80 tests. Added assertions distinguish preserving an existing migrated row type from defaulting a missing type to `string`. The full-file `toys.js` scan remains pending.

The lines 850-1035 key/value element and type-selector scan instrumented 53 mutants: 48 killed, 0 non-static survivors, and 0 timeouts across 68 tests. Added exact key-handler data wiring, toggle labels/classes, type-selector fallback behavior, and disposer identity checks. The full-file `toys.js` scan remains pending.

The lines 1035-1124 add/remove row-handler scan instrumented 27 mutants: 26 killed, 0 non-static survivors, and 0 timeouts across 47 tests. Added exact add-once/remove-state behavior and null row-data fallback coverage. The subsequent row-construction range remains pending.
