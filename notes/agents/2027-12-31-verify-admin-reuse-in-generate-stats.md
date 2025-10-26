# Verify admin reuse in generate stats

- Noticed `generate-stats` repeated the bearer token verification that already lives in `createVerifyAdmin`.
- Confirmed the helper exposed enough hooks (custom response senders) to mirror the existing behavior.
- Replaced the inline checks with the shared helper and reran the full Jest suite to be sure the cloud handler flow stayed intact.
