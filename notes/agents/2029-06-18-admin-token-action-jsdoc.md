## Summary
- captured the jsdoc requirements for the admin token validation helper so future fixes can reuse the typedef layout
- noted the approach for modeling the callback context without relying on DOM globals

## Verification
- npx eslint src/core/browser/admin/token-action.js --no-color
