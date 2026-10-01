# Numeric fulfillment coordinates

Normal and procurement-backed proposals share strict finite numeric inclusive
range checking. The procurement prefix accepts numeric strings and therefore
must not use this stricter helper. Direct regressions cover strings, NaN,
Infinity, out-of-range values and both inclusive endpoints.

Nine fulfillment suites pass90 tests (`/tmp/dadeto-coordinate-range-tests.log`);
repository lint and type checking pass in corresponding lint/types logs.
The unrestricted duplication result is `/tmp/dadeto-coordinate-range-duplication.log`
and reports/duplication/jscpd-report.json; it remains red. No scan exceptions,
exemptions or ignore pragmas were added. dadeto-aaou remains open.
