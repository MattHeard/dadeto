# Render-variant CDN invalidation AllowEffects migration

- Unexpected hurdle: the renderer's general fetch dependency also reads the GCP metadata token, and adding a permission to that function would pass the token as native `fetch`'s URL.
- Diagnosis: traced both calls in the invalidation flow and confirmed `render-contents` has a separate implementation.
- Fix: inject a cloud-owned command binder and a dedicated permission-aware purge fetch adapter; keep the metadata GET on the ordinary fetch dependency and mint per path purge.
- Next-time guidance: split mixed read/write transports at the runtime adapter before requiring a capability. Migrate render-contents as a separate bounded follow-up.
