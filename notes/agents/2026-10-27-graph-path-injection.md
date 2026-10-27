# Inject graph import-path resolution

Bead: `dadeto-kjbj`, bounded child of built-in policy remediation `dadeto-e1oz`.

## Diagnosis and fix

The AST analyser imported node:path despite its injected parser and pure graph
result. A nonphysical alias fixture showed an injected resolver was unused.
Now resolveImportPath(file, source) is required and typed; the existing local
runner supplies the identical native normalize(join(dirname(file), source))
operation. All source callers were searched and updated. Unit fixtures inject
literal path mappings and a spy; they do not depend on the actual path module.
Failures propagate rather than returning a fallback graph. No source file moved.

## Evidence

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/scripts/function-dependency-graph-core.test.js
npm run check:impact:run -- --files src/core/scripts/function-dependency-graph-core.js
npm run function-graph
npm run check -- --skip-tests
npm run build
```

Final focused tests: 9 pass, including resolver delegation and error propagation.
Scoped coverage: source collected, no uncovered lines/branches; lint/core parse
and zero clones pass (`/tmp/dadeto-kjbj-impact.log`). All 10 aggregate static gates
pass (`/tmp/dadeto-kjbj-check.log`), including thin adapter and checkJs validation.
The static gate was inadvertently invoked twice while a chained command advanced;
both exited zero and were awaited before recording final artifacts. Avoid starting
a second gate without checking the existing live session.

The actual graph runner writes reports/function-dependency-graph.json: 10,058
nodes, 10,215 edges, 3,564 ignored calls and zero unknown edge endpoints. Build
passes (`/tmp/dadeto-kjbj-build.log`). These generated reports remain ignored.
Full-suite evidence is the exact pushed Full Check, separately recorded in Beads.

## Remaining work

This removes one of the 15 audited Node-importing legacy modules (one of 28
imports). The other 14 modules / 27 imports, observable builtin prohibition,
parse/thin root classification and eventual source moves remain under Rank 11.
The analyser's pre-existing blanket Stryker directive remains unchanged: passing
coverage is not proof of mutation acceptance. Audit/remove existing skips under
the final architecture criteria. Its manual CLI currently scans legacy core;
update that analysis inventory when moving modules, alongside the enforced gates.
