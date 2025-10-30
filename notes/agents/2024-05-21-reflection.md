# Reflection

- I expected the JSDoc plugin to warn about missing tags, but the lint report already contained hundreds of unrelated warnings. Running `npm run lint` confirmed the targeted fixes without introducing new noise, though it took a while for the report to print.
- Remember that the lint script writes to `reports/lint/lint.txt` and can take time to stream the full report to stdout; patience beats rerunning the command.
- Next time, consider tailing the report file directly when waiting for ESLint output—it might surface the relevant section sooner without wading through the entire log.
