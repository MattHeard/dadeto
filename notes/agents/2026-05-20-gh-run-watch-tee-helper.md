Added a small `npm run gh:watch` helper that tees `gh run watch` output into `reports/gh-run-watch.log`.

Unexpected hurdle: the first pass of the helper was just a one-off command, which was too easy to forget or mistype later.

Diagnosis: the workflow benefit only really lands if the command is reusable and remembers where it wrote the log.

Fix: added a dedicated script plus an npm alias so the next workflow watch can be started with one stable entrypoint and a predictable log path.

Next-time guidance: if we want realtime failure highlighting too, we can layer a tiny log scanner on top of this file-backed watch without changing the command shape.
