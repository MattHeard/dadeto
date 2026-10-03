# Header and coordinate clone reduction

The strict scan initially replaced a coordinate clone with an import clone;
removing an unconditional lazy wrapper then exposed additional header tails.
Always rescan before treating an extraction as a reduction.

Service-area coordinates now use the canonical lazy nullable builder while
retaining numeric normalization, inclusive geographic bounds, and getter order.
Debug header candidates use canonical exact-string projection after the original
nonempty-array destructuring. Empty strings remain absent, whitespace remains
unchanged, nested arrays remain invalid, and only the first element is inspected.
Header-key fallback remains ordered and lazy.

Evidence:
- `.tmp/service-header-tests.log`: 73 tests in two suites pass; both changed
  source owners have 100% statements, branches, functions, and lines.
- `.tmp/service-header-static.log`: static check exits 1 solely for duplication;
  the remaining nine evaluators pass.
- `.tmp/service-header-duplication.log`: 73 strict clones, down from pushed 75.
- `.tmp/service-header-cloud-build.log`: cloud packaging passes.

The zero-clone goal and terminal full-check acceptance remain open in dadeto-aaou.
