# Render variant tree-visibility startup registration

- Unexpected hurdle: the latest scheduled GCP run failed while loading the Gen1 `render-variant` function, before it could reach the query-performance measurement.
- Diagnosis: `createTreeVisibilityRegenerationHandles` invokes registration adapters as `(allowEffects, handler)`, but the cloud adapters expected `(allowEffects, { functions, handler })`. The resulting `handler` function was treated as the options object, so `options.functions` was undefined.
- Fix: added a small adapter factory that binds the injected Functions SDK and exposes token-first scheduled and HTTP callbacks; the render-variant startup composition now supplies those callbacks. Added a focused adapter regression.
- Next time: inspect the first scheduled query-performance artifact after the deployment passes; the October 14 run had no benchmark artifact because Terraform Apply failed during function initialization.
