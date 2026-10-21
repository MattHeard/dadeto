# Threefold Wakeform Shoals

- **Unexpected hurdle:** the first focused pass found uncovered default-state, wrong-route, and missing-Wakeform branches; the sandboxed rerun also could not spawn Node/Git (`EPERM`).
- **Diagnosis:** inspect the helper's exact branch map and focused coverage report; the test process had not started on the restricted attempt.
- **Chosen fix:** add direct characterization cases for those three branches, then rerun the same focused evaluator with reviewed elevated access. It passed 19 suites / 217 tests with zero uncovered lines or branches in changed core files and zero clones.
- **Additional evidence:** `npm run build`, `npm run manuals:check` (79 manuals), `npm run check -- --skip-tests`, and `npm run check` passed. The full fast check covered 977 suites / 6,818 tests across five shards and all 10 static gates. Crownback's exact-head Full Check and Terraform Validate also passed.
- **Next-time guidance:** request the reviewed execution context for local Node/Git subprocess checks when the restricted sandbox returns `EPERM`. For branch coverage, add one direct test for each uncovered helper path rather than relying on broader route flows to happen to reach it.
