# Strict assignment context

The minTokens 14 report identified repeated shift-list preparation and stock
world-line argument setup across single and atomic assignment writers.
strictAssignmentCore now owns those operations. Callers still select their
point defaults and existing asset history explicitly.

Do not combine the writers' validation ordering: the runner writer rejects a
missing shift before excessive speed, while the atomic writer checks speed
first. The new precedence regression verifies both reject without mutation.

Acceptance artifacts: `.tmp/strict-assignment-tests.log` (focused exact
coverage) and `.tmp/strict-assignment-static.log` (all static gates including
the unchanged strict duplication configuration). Broader duplication work
remains owned by dadeto-aaou.
