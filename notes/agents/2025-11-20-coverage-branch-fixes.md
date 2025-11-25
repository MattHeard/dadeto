Unexpected log: coverage was stuck below 100% even though all tests passed because the branch map kept pointing at `preventDefaultEvent`, `logInvalidateFailure`, and the `bucketName || DEFAULT_BUCKET_NAME` expression. I dug into the coverage data, confirmed line numbers (1164/1302 in `admin-core.js` and 968/1826 in `render-variant-core.js`), and realized the missing branches all required hitting the alternate path (event without `preventDefault`, `consoleError` absent, and supplying a falsy `bucketName` so the fallback ran).

Resolution: added targeted coverage bumps—new createRegenerateVariant spec with an event that lacks `preventDefault`, two invalidation specs that cover response failures both with and without a console logger, and bucket-name tests that exercise the truthy and falsy cases around the storage helper. Those additions pushed the Jest coverage report to 100%.

Lesson: branch coverage forces you to exercise both sides of guards, even when defaults make one path look unreachable (e.g., destructuring defaults keep `bucketName` truthy). Calling out those lines in a quick coverage note saves hunting later if a future refactor leaves one side untouched.

Open question: should we add a lightweight checklist for future coverage runs that flags these kinds of short-circuit guards so they don't slip past the first 100% pass? EOF
