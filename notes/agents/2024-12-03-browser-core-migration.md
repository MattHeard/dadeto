# Browser core migration

- Moved the Google sign-out helper into the browser core module and made sure
  every import now flows through the new bridge.
- Updated the Cloud copy script so infra picks up the relocated module.
