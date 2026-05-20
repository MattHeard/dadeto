Moved `src/cloud/cors-config.js` into `src/core/cloud/cors-config.js` and left the cloud file as a re-export shim.

Unexpected hurdle: the new core helper tripped lint complexity warnings at first.

Diagnosis: the helper still bundled prod, test, and default-origin branches in one function.

Fix: split the origin selection into small pure helpers so the main export stayed simple and the lint gate passed.

Next-time guidance: when a moved config helper starts to branch, extract the environment-specific cases early and keep the public export as a small dispatcher.
