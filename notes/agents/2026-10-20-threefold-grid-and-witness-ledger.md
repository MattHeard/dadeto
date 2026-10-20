# THREEFOLD grid and witness-ledger loop

- Unexpected hurdle: changing the canvas lattice from four to eight logical pixels made one narrow gate footprint round to the same width at adjacent scales, and the first full check exposed episode assertions that correctly gained ledger events.
- Diagnosis: inspect the actual rendered wall bounds at each scale, then compare total footprint area rather than one dimension. The full check also exposed incomplete JSDoc shapes and duplicated outcome validators.
- Fix: use one eight-pixel display lattice with upward size quantization, retain continuous simulation and water values, update legacy assertions to check outcome fields, type the ledger/action boundary, and move shared persisted outcome sets into one module. Add a text-only linked event journal and eight-pixel page controls.
- Next time: inspect representative rendered shapes at the coarsest grid before changing the lattice; run the focused renderer/episode/save/runtime/page suites, then `npm run check`. Documentation changes currently trigger the all-unit fallback; GitHub Full Check remains the full coverage authority.
- Remaining question: the broader THREEFOLD spec still needs authored contested testimony and unresolved-responsibility handling without inferred motives or moral scoring.
