# Notion Codex coverage

- Added config tests and included the existing local poller, API, and launcher suites in the directory coverage command.
- Acceptance command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/notion-codex test/core/local/notionCodex.backoff.test.js test/core/local/notionCodex.outcomeStore.test.js test/local/notionCodex.poll.test.js test/local/notionCodex.notionApi.test.js test/local/notionCodex.launcher.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/local/notion-codex/**/*.js' --coverageReporters=text-summary`.
- Evidence: 9 suites and 67 tests passed; statements 251/251, branches 132/132, functions 69/69, lines 247/247.
- Unexpected hurdle: the first directory slice omitted `test/local` suites, making already-tested poll/API/launcher files appear uncovered.
