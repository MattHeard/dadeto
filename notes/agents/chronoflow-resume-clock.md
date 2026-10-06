# Chronoflow resume clock synchronization

- Unexpected hurdle: the page refreshed stale clock estimates on a periodic timer, but a suspended tab had no immediate visibility-change path and could briefly retain its pre-sleep trust.
- Diagnosis: trace `startChronoflowPage` clock lifecycle and compare it with acceptance requiring sleep/resume behavior. The timer was monotonic and stale-safe eventually, but not immediate on foregrounding.
- Chosen fix: invalidate the estimate on hide, disable timed controls, resample from the configured Internet endpoint on show, discard samples that cross visibility revisions, and retry after an in-flight request settles. Failed resume sampling leaves timed play paused.
- Next-time guidance: model page visibility with injected `documentObj`, network, and monotonic clock dependencies. Test both ordinary resume and the request-in-flight race; never use local wall time to recover.
