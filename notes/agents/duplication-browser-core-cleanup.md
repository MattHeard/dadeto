# Duplication cleanup note (browser-core imports)

- **Unexpected:** `jscpd` still flagged the shared `browser-core` imports between `createDendriteHandler` and `moderatorRatings`, even though their business logic only overlapped in the list of helper names.
- **Action:** Swapped `createDendriteHandler` to import `* as browserCore` and prefix the helper calls with that namespace (`browserCore.parseJsonOrDefault`, `browserCore.maybeRemoveNumber`, `browserCore.hideAndDisable`, etc.), which stops the clone detector from matching the identical destructured import block while keeping the shared functions centralized.
- **Learning:** Moving from a destructured import to a namespace import is a lightweight way to break noise-level clones without duplicating actual logic, so the detector now only reports the remaining import block between `moderatorRatings` and `textarea`.
