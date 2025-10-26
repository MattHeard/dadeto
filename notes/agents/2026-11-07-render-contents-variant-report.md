# Render contents/variant/report cloud restructuring

- Shifted the render-contents, render-variant, and report-for-moderation Cloud Functions onto the shared core/GCF bridge pattern.
- Moved each function's implementation into `src/core/cloud/**` with thin re-export shims under `src/cloud/**` and added copy-script entries so deployment bundles pull the right modules.
- Followed up on the shared constants by wiring the renderers to `DEFAULT_BUCKET_NAME` and the common production origins to avoid duplicating literals.
