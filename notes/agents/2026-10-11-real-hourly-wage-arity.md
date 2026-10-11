# REAL1 form parameter-bag cleanup

- Unexpected hurdle: no behavior regressions surfaced; the affected builders had flattened a form context and field specification into large option bags.
- Diagnosis: the no-cache inventory pointed to `buildNumericField` and `buildGroupSection`; the three existing REAL1 handler, presenter, and toy suites cover input synchronization and rendered output.
- Fix: made the field builder receive section context, data model, field specification, and form cleanup context as separate named inputs. The group builder now receives form context and group specification separately.
- Evidence: target file is clear in `.tmp/real-hourly-wage-arity.json`; focused tests passed (3 suites, 24 tests); TSDoc passed; final elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 evaluators with 0 clones and 0 audit vulnerabilities (`.tmp/real-hourly-wage-arity-check.log`). Refreshed global inventory `.tmp/parameter-bag-global-after-real-hourly-wage.json`: 58 findings across 50 files, down from 60.
- Next-time guidance: keep form model, section view, field specification, and cleanup lifecycle as distinct concepts when composing dynamic forms.
