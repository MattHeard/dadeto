# Shared gate file traversal

The parse and dependency gates independently walked dirents for JavaScript leaves.
gate-utils now owns walkJavaScriptFiles. The dependency gate keeps absolute paths;
the parse gate keeps leaf-time relative projection and slash normalization. Its
reader adapter retains the fsModule receiver rather than detaching the method.
The path adapter is always called as a method. Directories take precedence over
file checks, traversal remains depth-first and source dirent order is not sorted.

Evidence `.tmp/gate-traversal-tests.log`: 61 tests/three suites, exact 100% for all
three gate owners. Explicit test covers join receiver, recursive order, leaf-only
projection, empty/default projection and directories never probing file status.
`.tmp/gate-traversal-static.log`: duplication only, 54 to 53 strict clones.
`.tmp/gate-traversal-build.log` passes. No detection/ignore changes; aaou open.
