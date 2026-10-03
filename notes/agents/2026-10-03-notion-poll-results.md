# Notion poll outcome envelope

The active-run, idle-backoff, dry-run, and successful-launch results now share
createPollResult. It establishes launched=false unless the launch result
explicitly overrides it, and attaches the reconciled or persisted state.
Caller-specific fields and their insertion order remain unchanged.

The extraction does not move reconciliation, outcome reading, backoff writes,
prompt creation, launch, or the successful state write. Existing active-run
skip and successful-launch regressions now also assert returned state contents
and identity with the state passed to writeState.

Evidence: .tmp/notion-poll-envelope-tests-final.log records 18 passing tests
and exact 100% statements/branches/functions/lines for poll.js.
.tmp/notion-poll-envelope-scan.log records strict clones96, down98.
.tmp/notion-poll-envelope-static.log records all nine non-duplication gates
passing, with duplication96 the only failure. No ignore, exception, or
threshold changes were introduced. The remaining poll matches are distinct
object/lifecycle helpers, not the removed result-construction suffixes.

Unexpected hurdle: the report contains very short structural suffixes, so
changing a single return could merely relocate a match. Sharing the complete
result envelope for every outcome removed both targeted pairs and retained
the meaningful poll result contract. Keep using the fresh exact report.

This is a bounded checkpoint toward dadeto-aaou, not proof of a green aggregate
or completion of the zero-clone goal. The terminal aggregate must be rerun.
