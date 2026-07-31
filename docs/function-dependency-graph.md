# `src/core` function dependency graph

Generate the graph data with:

```bash
npm run function-graph
```

This writes `reports/function-dependency-graph.json` (which is generated and
ignored by git). Serve the repository root and open `tools/function-dependency-graph.html`:

```bash
npx serve .
```

Each function is a node. An edge is emitted only when a call resolves to a
function declared in `src/core` through a local binding or a statically known
relative import. Calls through function parameters and members of injected
object parameters are recorded in `ignoredCalls` and deliberately do not
become edges. Ambiguous dynamic property calls are omitted.

Click a node to show its immediate callers and callees; use the search field to
filter by function name or file path.
