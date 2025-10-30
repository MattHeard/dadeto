# Lint warning cleanup follow-up

## Surprise
Running the lint script streamed hundreds of warnings to stdout. I expected the report to end quickly, but it kept going for a while because ESLint writes to `reports/lint/lint.txt` first and only then dumps the entire file. It looked as if the command had hung before the output finally appeared.

## Diagnosis
I let the command continue running and double-checked the generated report instead of interrupting it. Parsing the report directly with a small Python script (`python - <<'PY' ...`) made it easy to confirm which `src/core/` warnings were still outstanding after my change.

## Lesson
When lint runs feel stuck, give them time to finish and inspect the report artifact rather than terminating the process. Having a quick script ready to summarize the warnings per directory/file saves time compared with manual counting.

## Follow-ups
It could be worth checking in a helper script that summarizes lint warnings by folder, so future cleanup efforts can focus on the noisiest modules immediately.
