# Required assignment identifiers

Three asset/custodian normalizers share a typed required-field parser. Existing
String(value || '') coercion is retained: nonzero numeric identifiers normalize
to text, but zero and other falsy identifiers are rejected. Arrays and non-record
inputs remain invalid. Public output shapes and names are unchanged. Removed the
old suppression comments inside the replaced bodies; none added to the helper.

The full refresh before extraction exited1 with all coverage metrics100% and
three static failures: non-core-thin, core-parse and duplication
(`/tmp/dadeto-hardening-refresh-check.log`). The extracted module's12 tests pass
with100% all metrics (`/tmp/dadeto-assignment-record-tests.log`); repository lint
and types pass in corresponding logs. Current unrestricted duplication evidence
is `/tmp/dadeto-assignment-record-duplication.log` and its JSON report. The goal
remains open under dadeto-aaou until the full aggregate passes.
