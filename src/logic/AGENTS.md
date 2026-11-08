# Logic namespace routing

Follow the repository router, `CLAUDE.md`, and the shared coding/review practices
in `src/core/AGENTS.md` during the incremental migration. Acceptance and current
scope live in `docs/architecture/typed-logic-migration.md` and the owning bead.

- `core/` contains precisely typed trusted computation. Preserve meaningful
  domain/state decisions; remove argument guards only after tracing typed callers.
- `boundary/` contains pure total parsers with explicit untrusted input and typed
  outcomes, including acceptance, coercion, default and failure semantics.
- Keep platform/framework imports in integration code. Supply platform operations
  through explicit dependencies and the existing AllowEffects boundaries; do not
  mint permission tokens in logic.
- Run all four 100% coverage gates and scoped mutation evidence for moved logic,
  plus the required local aggregate and authoritative full CI. A path move must
  update actual callers, quality-tool discovery and focused harness dependencies.
- Preserve deployed imports/URLs through verified packaging when affected.
  Do not leave legacy forwarding source or copy exclusions to the new namespace.
