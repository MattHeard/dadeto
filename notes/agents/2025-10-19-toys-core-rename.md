# Toys core rename migration

- **Challenge:** Moving `src/core/toys/utils/csv.js` to `src/core/toys/toys-core.js` meant every consumer import had to change, and the mirrored Jest suite path broke when I relocated the test.
- **Resolution:** Updated the toy modules to import from the new shared module, relocated the Jest spec to `test/core/toys/toys-core.test.js`, fixed the relative import to the source file, and reran `npm test` to confirm the suite passes.
