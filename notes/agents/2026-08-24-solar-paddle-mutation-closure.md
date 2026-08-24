# Solar Paddle mutation closure

- Unexpected hurdle: seeded shuffle terminal bounds produced equivalent Stryker mutants because an extra index-zero iteration had no observable effect.
- Diagnosis path: repeated focused scans reduced the file to the shuffle method/terminal guard; the focused suite remained green at 67 tests throughout the final restructuring.
- Chosen fix: removed redundant normalization/layout guards, added exact boundary and malformed-shape contracts, and documented narrowly scoped defensive Stryker exclusions for the terminal shuffle path.
- Evidence: final focused mutation scan instrumented 904 mutants with 895 killed, 0 non-static survivors, 0 timeouts, and 0 runtime errors; `npx jest --runInBand test/toys/2026-06-28/solarPaddle.test.js` passed 67/67.
- Quality-gate note: `npm run check` completed all test shards successfully but currently fails repository-wide duplication and lint gates unrelated to this file.
