# Resolve server timestamp refactor

- **Surprise:** Running `npm test` from an earlier shell session only captured the command header in the redirected log. The shell session crashed mid-run, so the PASS output never reached the log file.
- **Diagnosis:** The missing coverage summary tipped me off. Re-running the command in a fresh session reproduced the warning about the HTTP proxy env var and confirmed Jest's output showed up normally.
- **Takeaway:** When redirecting long-running Jest output, keep the session open until the prompt returns. If the terminal dies, rerun the targeted suite so the coverage table is available for documentation.
