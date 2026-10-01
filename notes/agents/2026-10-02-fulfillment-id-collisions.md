# Fulfillment identifier collisions

Both proposals share generated-versus-possession identifier collision checking.
Required ID shape/count checks remain local because their contracts differ.
The collision error string and strict Set equality semantics are unchanged.

Nine focused fulfillment suites pass90 tests (`/tmp/dadeto-distinct-ids-tests.log`);
repository lint and type checking pass in corresponding lint/types logs.
Unrestricted minTokens14 duplication evidence is
`/tmp/dadeto-distinct-ids-duplication.log` and its JSON report; it remains red.
No exemptions, scan narrowing or ignore pragmas added. dadeto-aaou stays open.
