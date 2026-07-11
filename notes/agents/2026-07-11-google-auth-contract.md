# Google auth author UUID contract

- Unexpected hurdle: the first focused test run had no installed `node_modules`.
- Diagnosis: `getAuthorUuidUrl` was constructed as a Promise in the browser entrypoint while the cache contract calls it as a function; the contents bootstrap also bypassed `disableGoogleSignIn`.
- Fix: reuse a memoized config loader behind a callable getter, guard the status bootstrap with static config, and provision the author UUID function URL in Terraform config.
- Next time: exercise the installed browser wrapper callback path when changing auth wiring; component tests alone will not catch Promise/function mismatches.
