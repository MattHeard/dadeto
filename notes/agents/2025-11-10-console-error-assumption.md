Made `resolveStoryMetadata` assume `consoleError` is always provided by callers, removing the no-op default and optional guards so any missing logger surfaces immediately.

Unexpected hurdle: none—the helper already behaved correctly because callers always supply a logger, so the change was purely simplification.

Lesson: when dependencies are already wired everywhere upstream, small helpers can rely on them and stay concise without defensive branching.

Open questions: none.
