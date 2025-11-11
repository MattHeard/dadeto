Made `resolveParentUrl` treat `consoleError` as a required dependency by removing the optional guard and logging directly in the catch block; the helper now assumes upstream wiring always supplies a logger, aligning with the rest of the render helper suite.

Unexpected hurdle: none—callers already pass `consoleError`, so the change merely tightens the signature.

Lesson: when a dependency is always provided, dropping the optionals keeps helpers predictable and coverage-complete.

Open questions: none.
