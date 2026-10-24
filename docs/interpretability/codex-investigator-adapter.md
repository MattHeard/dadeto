# Local Codex investigator adapter

`src/local/interpretability/algZooCodexInvestigator.js` implements the injected `runInvestigator` boundary for the AlgZoo paired pilot. It invokes `codex exec` with argv (no shell), an ephemeral session, a fresh mode-0700 temporary workspace, `workspace-write` sandboxing, disabled apps/plugins/multi-agent features, and a JSON Schema response. It forwards only the assigned session, the harness-approved map entries, and the fixture hash. It does not forward evaluator data or held-out values. The child environment is restricted to `PATH`, `HOME`, `CODEX_HOME`, `TMPDIR`, and locale variables; API-key environment variables are not forwarded. Workspace files use mode 0600 and are removed after each invocation.

Before starting Codex, the adapter reserves the session's full investigator-token and tool-call budgets. It settles those reservations from the single `turn.completed` JSONL event and counts started tool items. The measured investigator token total is the reported input plus output token count. Each returned session record preserves the CLI version, selected model, start/end timestamps, input/output token counts, and tool-call count. Codex reports usage at turn completion, so this accounting detects an overrun after the turn; it cannot terminate generation exactly at the token cap. The harness deadline does abort the child process. This reporting overshoot must be included in any eventual pilot report.

## Prelaunch hold

This module is process and output plumbing only. It has not invoked Codex or used credentials. The harness returns the runtime metadata in its session records, but no append-only audit writer stores those records yet. The adapter does not yet provide the pinned model weights, frozen common-background bundle, a verified local target-forward-pass tool, or actual isolation evidence. Its reported target-forward-pass count is therefore zero. Do not connect it to a pilot runner or launch assignments until those inputs are injected and the following gates are independently verified on the Pi 5 runtime:

- Confirm the Codex CLI version/model and subscription authentication under the dedicated persistent runtime identity.
- Verify rootless Podman or equivalent isolation, workspace boundaries, network denial, environment allowlisting, and cleanup with real canary probes and access logs.
- Confirm the complete fixture and common-background inputs are frozen, hashed, read-only to the investigator, and exclude held-out/future/opposite-arm data.
- Add append-only audit records outside investigator workspaces, including failed and interrupted runs, prompt/config hashes, runtime version, timestamps, and measured usage.
- Verify the token allowance's post-turn overshoot behavior and ensure equal limits for both arms.
- Complete the spec's blinded scoring, independent review, rehearsal, and experiment-wide budget gates.

Synthetic unit tests only prove argument construction, data filtering, JSONL accounting, cancellation, and cleanup; they do not satisfy any of these live prelaunch checks.
