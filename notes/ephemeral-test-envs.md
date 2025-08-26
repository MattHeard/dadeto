# Ephemeral Test Environments Proposal

This document outlines a workflow where each code change spins up a temporary Google Cloud environment, runs Playwright end-to-end tests, and deploys to production only when the tests succeed.

## Overview
- **Ephemeral staging**: Terraform provisions a namespaced Cloud Run service and related resources using a short-lived `env_id` (e.g. commit SHA).
- **Playwright in Cloud Build**: A Cloud Build job uses the official Playwright Docker image to run the test suite in an isolated runner.
- **Artifacts in GCS**: Test reports, traces, and screenshots upload to a long-lived Cloud Storage bucket for later inspection.
- **Production gate**: If tests pass, the staging stack is torn down and the change deploys to prod. Failures keep the environment up temporarily for debugging.

## Workflow Steps
1. GitHub Action authenticates to GCP via Workload Identity Federation.
2. Terraform applies the staging stack with the unique `env_id` and outputs the service URL and artifacts bucket.
3. Cloud Build runs Playwright against the staging URL and stores artifacts in GCS.
4. On success, Terraform destroys the staging stack and a production deploy job runs. On failure, the workflow exits and the environment remains for investigation.

This pattern keeps production stable while providing disposable test environments for every commit.
