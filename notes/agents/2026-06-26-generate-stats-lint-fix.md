Unexpected hurdle: the lint failure in generate-stats was not a single stylistic issue; the inner factory had grown past max-lines/max-statements and needed structural extraction before the remaining warnings would disappear.

Diagnosis path: I reran eslint on src/core/cloud/generate-stats/generate-stats-core.js, confirmed the warnings were concentrated in the factory, then moved the non-closure helpers to module scope and removed the last ternaries with explicit branches.

Chosen fix: keep createGenerateStatsCore thin, extract Firestore counting/top-story helpers as module-level functions with explicit deps, and replace ternary-heavy error handling with simple if branches.

Next-time guidance: when a lint failure is mostly structural, start by shrinking the enclosing function before polishing individual warnings; it usually clears several rule hits at once.
