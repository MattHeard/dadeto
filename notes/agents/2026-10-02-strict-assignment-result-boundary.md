# Shared strict assignment result boundary

The asset and runner writers repeated JSON parsing/catch handling, feasibility
rejection, persistence, and success-envelope construction. Their shared strict
core now owns those phases. Each writer supplies its actual domain evaluation
and a persistence descriptor; early identifier/shift failures still return the
same serialized rejection. Asset object metadata and runner shiftId metadata
remain intentionally different.

The first extraction shared only persistence but left rejection/construction
tails cloned. Tightening the boundary to accept either a rejection string or a
feasibility-bearing descriptor removed those tails instead of changing tokens
or scanner configuration. The exact duplication report decreased from 194 to
192 clones at unchanged strict minTokens 14.

Evidence: validatedAssignmentToys passes 7/7 table-heavy tests with exact 100%
coverage for strictAssignmentCore; lint and JSDoc types pass. Logs are
`.tmp/assignment-result-{tests,lint,types,duplication,deps}.log`, with focused
coverage under `.tmp/assignment-result-coverage`. Additional focused collection
includes both migrated writers. Repository-wide aggregate remains unproven for
this source change; no bead closure or complete-green claim is made.

Next-time guidance: consolidate the entire protocol phase, not only its final
write. Preserve distinct feasibility policies and metadata while sharing the
common envelope. Remaining parser and duplication work stays on dadeto-aaou.
