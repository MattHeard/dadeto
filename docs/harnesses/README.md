# Harness Types

Harnesses are lightweight evaluators that turn assumptions into repeatable checks.

## Available harness categories

1. **Smoke harness**
   - Fast boot/basic flow checks proving core paths still execute.
2. **Deploy verify harness**
   - Post-package or post-deploy probes confirming runtime viability.
3. **Performance harness**
   - Budget checks for latency, throughput, or generation/runtime cost.
4. **Snapshot harness**
   - Output/state snapshots to detect unintended behavioral drift.
5. **Debugging harness**
   - Focused repro scripts for historically flaky or hard-to-isolate failures.

## Harness expectations

- Must define command, expected signal, and owning subsystem.
- Prefer deterministic inputs and artifact-producing outputs.
- Promote recurring manual checks into scripted harnesses.
