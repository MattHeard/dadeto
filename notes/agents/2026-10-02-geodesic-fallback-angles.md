# Geodesic fallback angular reuse

When Vincenty's inverse calculation does not converge, its spherical fallback now receives the already-resolved latitude angles and longitude difference. Preserve the latitude-difference conversion order: subtract degrees first, then convert that difference to radians. Do not replace it with subtraction of rounded radian latitudes.

The fallback keeps the same semi-major-axis radius and haversine expression. Existing coverage exercises convergent WGS84 measurements, coincidence, polar cases and antipodal fallback; new date-line antipode tests lock the unrounded half-circumference in both directions.

Artifacts: `.tmp/geodesic-fallback-tests.log`, `.tmp/geodesic-fallback-coverage`, `.tmp/geodesic-fallback-static.log`, `.tmp/geodesic-fallback-lint.log`. Keep strict `minTokens: 14` unchanged; dadeto-aaou owns the remaining full aggregate cleanup.
