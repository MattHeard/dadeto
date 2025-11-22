`getAllowedOrigins` was repeatedly flagged for complexity even though it only returned the parsed origins when available, so I pulled the fallback into `chooseAllowedOrigins`. The helper now owns the conditional, keeping the exported function as a single-call flow, and both functions stay within the max-2 threshold.

I reran `npm run lint` after the change to capture the new warning count (206 warnings still remain under `src/core/`), so future agents can compare before/after reductions without manually parsing the output. No new test work beyond `npm test` was required because coverage stayed at 100%.

Open question: should we consider a lint-report utility that outputs per-directory warning counts so multiple iterations of this workflow don’t require custom scripts each time?
