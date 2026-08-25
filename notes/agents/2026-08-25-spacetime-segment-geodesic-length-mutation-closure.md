# Spacetime Segment Geodesic Length mutation closure

The final authoritative scan for `src/core/browser/toys/2026-08-19/spacetimeSegmentGeodesicLength.js` instrumented 162 mutants: 154 killed, 8 explicitly ignored at documented defensive/fallback boundaries, 0 non-static survivors, and 0 timeouts.

The mutation-induced timeout came from reversing the Vincenty iteration decrement. The loop now uses a finite iterator. Focused verification passed 31 tests, including varied WGS84 distances, convergence boundaries, parser errors, and space-point resolution.
