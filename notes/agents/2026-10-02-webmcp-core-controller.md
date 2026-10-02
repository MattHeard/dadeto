# WebMCP core controller and thin adapter

The remaining non-core wrapper violation was the shared browser WebMCP module.
Its catalog cache, approval policy, bounded execution, response envelopes and
same-origin page tools now live in `src/core/browser/webmcp.js`. The browser
adapter injects fetch, module import, document, location and modelContext and
retains its three public exports plus automatic four-tool registration.

The catalog checks complete toy definitions before approval; the old redundant
missing-toy guard in approval was therefore removed, not suppressed. A shared
failure envelope avoids introducing clones as previously unscanned browser
logic moves into core. Injected loaders make success/error paths deterministic.

Evidence: 13/13 core and legacy adapter tests, exact 100% coverage in all four
metrics (`/tmp/dadeto-webmcp-tests.log`, `.tmp/webmcp-coverage`). Repository lint,
types, dependency checks, the main build, and Dendrite packaging pass in the
corresponding `/tmp/dadeto-webmcp-*.log` files. `npm run non-core-thin` now passes:
240 files, zero exemptions. Duplication remains 194 clones at minTokens 14;
the gate still exits 1. No aggregate success or bead closure is claimed.

Dendrite packaging refreshes old tracked copies unrelated to this loop; those
were restored to their pre-build contents using patches, retaining only the
relevant WebMCP adapter change. New build-only assets were moved to recoverable
directories under `.tmp/dendrite-generated*`. An attempted backup into /tmp
filled its tmpfs; that partial backup was recovered into the repo-local temp
directory. Use repo-local temporary directories on this host.

Next gate work remains rental parsing/domain separation and exact duplication
report cleanup. The canonical owning bead is dadeto-aaou.
