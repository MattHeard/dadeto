# Process new page/story & prod visibility structure

- Broke out the process-new-page Firestore trigger into a core module with dependency-injected randomness, recreating bridges for findAvailablePageNumber and variant naming so the existing utilities and tests continue working.
- Mirrored the structure for process-new-story and prod-update-variant-visibility, adding Cloud/Core shims plus copy script entries so each deployment package picks up the shared common-core/common-gcf bridges.
- Debugged the Jest failure caused by removing the legacy variantName bridge by restoring a thin re-export module pointed at the new core implementation.
