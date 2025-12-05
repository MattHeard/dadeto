## Dendrite Visibility toy – lint surprises

- The strict lint rules (complexity max 2, no ternaries, max params 3) turned into the biggest time sink. The initial implementation passed the algorithmic tests but lint flooded the new files with warnings. I had to redesign the Dijkstra flow to use guard arrays and option objects so each function stayed under the complexity/param caps.
- Optional chaining inside small helpers (`ratings?.[id]`) and compound conditions still triggered complexity warnings. Breaking guards into standalone helpers and avoiding optional chaining in those spots kept ESLint quiet.
- The reduce-based weighted sum still tripped `no-ternary`; introducing a small accumulator helper with an explicit `if` avoided the rule while keeping the math readable.

**Guidance**: Start new toy helpers with the lint rules in mind—prefer single-purpose guards, option objects for parameters, and explicit `if` blocks over ternaries/optional chaining. If a function needs multiple decision points, split it early rather than trying to appease the complexity rule later. The guard-array pattern in `dijkstra.js` worked well for keeping the queue logic testable without inflating complexity.
