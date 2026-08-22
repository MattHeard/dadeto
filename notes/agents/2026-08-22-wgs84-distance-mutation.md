# WGS84 distance mutation loop

- Unexpected hurdle: boundary-only coverage left most of the numerical inverse solution and spherical fallback untested.
- Diagnosis: the algorithm needed oracle assertions across longitude, latitude, diagonal, antimeridian, antipodal, symmetry, and zero-distance cases.
- Fix: added a dedicated numerical oracle suite, exported the spherical fallback for direct verification, and classified only convergence-loop safeguards as static.
- Evidence: final Stryker scan reported 64 killed, 63 static/no-coverage mutants, 0 survivors, and 0 timeouts; focused tests passed 14/14.
- Next-time guidance: numerical helpers should receive an oracle matrix before mutation triage; convergence guards may be inherently unsuitable for mutation assertions.
