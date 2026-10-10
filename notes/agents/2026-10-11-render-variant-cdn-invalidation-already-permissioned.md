# Render-variant CDN invalidation audit

- Unexpected hurdle: the open CDN invalidation bead described the pre-migration callback shape, while current `main` already contained the capability boundary and adapter.
- Diagnosis: traced `createInvalidatePaths` through metadata token acquisition and each purge request, checked the Cloud Functions adapter and focused tests, and verified that render-contents owns a separate invalidation transport.
- Resolution: recorded the bead as stale rather than duplicating the existing migration. The render-variant core binds a permission for metadata fetch and a fresh permission per purge POST; its adapter uses the permission-aware fetch contract. Render-contents has its own permission-aware invalidation flow, documented as the fifth AllowEffects extension.
- Next-time guidance: compare open beads with current source and the architecture audit before editing; close stale preconditions with current test and quality-gate evidence.
