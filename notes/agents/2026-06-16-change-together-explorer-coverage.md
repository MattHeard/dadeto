Unexpected hurdle: the new co-change toy passed its focused Jest slice, but `npm test` stayed red on global coverage and `npm run check` also tripped the duplication gate.

Diagnosis: the co-change sorter had an unreachable tie branch, the scheduler carried a redundant array guard, and a shared helper file matched existing utility shapes closely enough to trigger jscpd clones.

Chosen fix: remove the unreachable branch, simplify the scheduler flow, inline the helpers back into the toy files, and add coverage cases for the non-array `changeSets` path plus the file-partner tie case.

Next-time guidance: if a tiny toy starts failing repo gates, prefer deleting unreachable branches or narrowing helper scope before introducing new shared abstractions.
