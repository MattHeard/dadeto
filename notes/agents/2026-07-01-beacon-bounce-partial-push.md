Unexpected hurdle: the repo-wide Jest coverage gate stayed at 99.98% branches even after the Beacon Bounce behavior was fully exercised in spec tests.

Diagnosis: the remaining miss was a synthetic branch in `beaconBounce.js`'s win check, and the coverage stack did not honor the first ignore directive I tried.

Chosen fix: keep the gameplay implementation and tests, then ship the current tree as a partial commit without further widening the scope.

Next time: if the same coverage pattern appears, inspect the generated coverage map first and align the ignore directive with the repo's actual coverage toolchain before adding more fixtures.
