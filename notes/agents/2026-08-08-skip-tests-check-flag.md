Unexpected hurdle: recording a Beads comment with unescaped backticks caused shell substitutions, which accidentally started the default aggregate check.

Diagnosis path: inspected the runner process list and worktree, then kept subsequent verification to focused Jest files and the explicit skip-tests aggregate path.

Chosen fix: add `--skip-tests` at the CLI boundary and route it through the resource-aware runner so it invokes only the existing non-test command list.

Next-time guidance: pass Beads comment text without shell-interpreted markup, and use `npm run check -- --skip-tests` whenever aggregate validation must avoid the memory-heavy test phase.
