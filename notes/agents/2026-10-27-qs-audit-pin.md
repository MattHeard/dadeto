# qs audit pin repair

Bead: `dadeto-u0xq`; interrupted refund hardening `dadeto-pu2z` and the
Rank 11 webhook parsing loop `dadeto-an58`.

## Failure and diagnosis

Full Check 40549912022 at f2e8e46 failed only its dependency audit. The root
`qs` override still pinned 6.16.0. The reviewed advisory
https://github.com/advisories/GHSA-6pq8-jhm2-2vcw lists 6.16.1 as patched.
Change that existing override and its single lockfile package record to 6.16.1;
no new dependency or audit-policy exception is needed.

`npm ls qs --all` confirms Express, body-parser and Stryker's typed-rest-client
all resolve to 6.16.1. `npm audit --audit-level=low` exits zero with no reported
vulnerabilities. Supported nested/array query roundtrip and comma-string
serialization assertions pass. Nine focused parser/domain/wrapper/Express/
simulator suites pass 112 tests, including a real local Express server.

## Evidence limits

A bounded library-only probe of the advisory's own-noncallable-toString comma
input still throws on the installed 6.16.1 package. Do not describe a clean
advisory database result as independent proof that this payload behavior has
changed. The project source has no direct qs import or comma serializer use in
its tracked JS/MJS source or workflow scripts. This is an audit-pin repair and
compatibility check, not proof of production exposure or exploit mitigation.
No production/provider request was sent. Keep audit policy intact and record
the exact descendant Full Check separately before closing the quality issue.

Logs: `/tmp/dadeto-qs-audit-before.json`,
`/tmp/dadeto-qs-audit-after.log`, `/tmp/dadeto-an58-static-final.log`.
The split static check follows explicit focused tests; it does not establish
repository-wide coverage. Build/cloud closure and CI receipts belong on the
owning Beads. Next time, inspect the actual resolved tree, audit exit, exact
lockfile delta and runtime behavior separately when advisory metadata changes.
