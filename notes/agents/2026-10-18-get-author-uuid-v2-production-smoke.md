# Retired production smoke setup

This file path remains for historical Notion links. On 2026-10-19, the production smoke workflow and its metadata handoff were removed in favor of Playwright coverage inside the existing `gcp-test` run against that run's temporary `t-*` deployment.

The former production-specific Workload Identity Federation setup and Actions variables are no longer required and their instructions have been removed. Do not create production smoke identities or send production smoke requests for Rank 1. The Playwright test uses a dedicated UID and a short-lived ID token scoped to the temporary Firebase tenant; any `authors/{uid}` write is confined to the temporary Firestore database.
