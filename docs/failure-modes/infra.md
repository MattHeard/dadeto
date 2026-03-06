# Infrastructure Failure Mode Seeds

## Symptom
- Deploy step completes partially, or runtime services fail after infra/apply changes.

## Likely cause
- Packaging mismatch between built artifacts and terraform expectations, permission misconfiguration, or stale state assumptions.

## Detection signal
- Terraform/apply output errors, cloud runtime logs, or missing artifact references during deploy.

## Prevention harness
- Run packaging commands before infra updates.
- Keep infra variable contracts documented and validated through pre-deploy checks.

## Fix path
1. Confirm deploy artifact presence and version alignment.
2. Diff infra variable/state assumptions from last known good deployment.
3. Apply minimal fix and run targeted deploy verify harness.
4. Record new guardrail in infra docs/tests/scripts.
