# Shared GCF helper relocation

- **Challenge:** Moving the helper out of the assign-moderation-job directory meant the infra copy step would otherwise ship only the lightweight re-export.
- **Resolution:** Added an explicit copy of `src/cloud/gcf.js` for the assign-moderation-job function so the real helper continues to deploy alongside the entry point.
