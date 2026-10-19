# THREEFOLD post-loss gate repair

- Unexpected hurdle: the first route attempt stopped short of the authored locking pawl. Three movement commands at scale −2 travel only about 6.8 cm.
- Diagnosis: movement is one ninth of scale-zero height and scales by powers of three, so one scale −2 step is about 2.26 cm. The player begins about 22 cm from the pawl after the gate-forcing route.
- Chosen fix: require scale −2, an in-range pawl, a forced-open gate, and a lost ferry after surge. Repair restores the gate/counterweight geometry, records a persistent repair outcome, and lets lower water recede during aftermath without restoring ferry, passenger, or Latchfolk outcomes.
- Next-time guidance: derive interaction routes from the actual canonical movement step at the target scale; test authored routes through the simulation rather than estimating from screen coordinates.
- Evidence: nine focused THREEFOLD suites passed (138 tests); outcome/save regressions passed (2 suites, 39 tests); `npm run build` passed; `npm run check` passed all 10 gates, including five all-unit fallback shards (956 suites, 6,555 tests), 0 audit vulnerabilities, and zero clones. The matching GitHub Full Check is pending. Record its exact result and artifact before closing Bead `dadeto-fan3`.
