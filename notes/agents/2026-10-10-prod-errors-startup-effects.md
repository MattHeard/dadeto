# Production error beacon startup effects

- Unexpected hurdle: the error beacon runtime assembled middleware and compatibility routes directly on the Express app inside core.
- Diagnosis: an audit of the next lexicographic `src/cloud` entrypoint found five startup registrations with no visible capability parameter; middleware factories themselves only construct values.
- Fix: moved `app.use` and `app.post` invocations to permission-first cloud adapters and forwarded one fresh startup capability from the external boundary. Core retains middleware construction and registration order.
- Next-time guidance: audit request-time response and logging effects separately; startup registration being capability-aware does not complete the whole error beacon call tree.
