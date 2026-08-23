# Ledger ingest toy mutation follow-up

## Unexpected hurdle

The first Stryker invocation matched no tests because the comma-separated test list was treated as one literal pattern, and the test file was omitted from the explicit `--files` set.

## Diagnosis

With the test file included, the authoritative scan found 58 mutants and seven survivors in validation guards. Four remained after direct input assertions because repeated type checks made some guard mutants behaviorally equivalent.

## Fix and evidence

Added discriminating assertions for non-string fixture candidates, coercion-resistant object candidates, non-object import inputs, and explicit source labels. Removed the redundant type branch from `isKnownFixtureCandidate`.

Evidence: `npm run mutant:all -- --concurrency 4 --mutate src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestToy.js --testFiles test/toys/2026-03-10/ledger-ingest.test.js --files 'src/core/**/*.js,test/toys/2026-03-10/ledger-ingest.test.js,test/toys/2026-03-13/ledger-ingest/ledgerIngestStorageToy.test.js,jest.mutation.config.mjs,jest.config.mjs,package.json' --timeoutMS 30000` produced 52 total, 50 killed, 0 static, 0 non-static survivors, 0 timeouts. Focused Jest passed 12 tests.

## Next-time guidance

When using Stryker `--files`, include the selected test files explicitly; verify the dry run reports the intended test count before trusting mutation results.
