# Render-author database binding

- Unexpected hurdle: `npm run check` exhausted `/tmp` during Jest transform-cache writes.
- Diagnosis: production logs showed the v1 Firestore trigger using `(default)` while Terraform and the handler used `DATABASE_ID`.
- Fix: bind `render-author` through `functions.firestore.database(process.env.DATABASE_ID)` via the shared trigger builder, with the existing default fallback.
- Next time: clear `/tmp/jest_rs` or use a smaller coverage shard before rerunning the aggregate check.
