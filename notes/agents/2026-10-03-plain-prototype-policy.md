# Direct-prototype record policy

The exact report paired browser toy and Firestore prototype checks. The generic
direct-prototype predicate now lives in validation and is exported through common
core. The old browserToysCore export is a compatibility re-export of the same
function, retaining identity and name. Firestore calls the shared predicate after
its original null/type/array guards. Array rejection is intentionally separate:
an array can have Object.prototype and must still not become a document record.

Evidence `.tmp/plain-prototype-tests.log`: 46 tests/three suites, exact 100% shared
validation and fake Firestore coverage. Tests cover compatibility identity, shadowed
constructors, null prototypes and an array with a changed prototype. Static:
`.tmp/plain-prototype-static.log`, duplication only, 59 to 58 strict clones.
Regular/cloud builds pass in `.tmp/plain-prototype-build.log` and
`.tmp/plain-prototype-cloud-build.log`. No exclusions or ignores changed; aaou open.
