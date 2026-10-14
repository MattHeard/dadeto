# JSON1 MCP stdio capability

- **Unexpected hurdle:** The first full coverage pass reported 99.95% function coverage even though the MCP integration tests passed.
- **Diagnosis:** The stdio test launches the server as a child process, so Jest cannot instrument `src/core/local/json1-mcp-server.js` in that process.
- **Fix:** Keep the real stdio client tests and add an in-process unit test for the injected core server factory. The focused report then showed 100% statement, branch, function, and line coverage for the core factory.
- **Evidence:** `DADETO_COVERAGE_SHARD_SIZE=80 DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed all 10 gates. A connected Codex session discovered `dadeto_canonicalize_json` and returned recursively canonicalized nested JSON.
- **Next time:** For child-process adapters, pair transport integration tests with direct tests of the core factory so coverage instrumentation sees core behavior. Keep the backlog item active until the configured tool is discoverable and invoked by a live agent.
