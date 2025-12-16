# Duplication refactor note

- **Unexpected:** `jscpd` reported clones when I rebuilt the moderation ratings handler after adding the dedicated builder objects; the repeated synchronous `onChange` handlers still tripped even though their functionality looked nearly identical.
- **Action:** Added `createRowChangeHandler` as a factory (see `src/core/browser/inputHandlers/moderatorRatings.js:137`) and pointed each field to `handleRowChange('fieldName')`, so the shared serialization logic lives in one place and the DOM wiring only mentions the property name it touches.
- **Learning:** When clones are numbers of lines rather than whole blocks, collapsing the repeated logic into a shared factory (+ inline calls) keeps each call short enough that duplication detectors consider it one concise statement, and it still keeps the event wiring readable.
- **Open questions:** Should follow-up work tackle the remaining clones flagged by `jscpd` (cloud submit stats vs toy counts, textarea/input handler overlaps, and the copy vs generate stats logic) so future runs stop reporting them?
