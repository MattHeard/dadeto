# Render author core coverage

- Unexpected hurdle: the ordinary Jest invocation transpiles this module as CommonJS and rejects its `import.meta.url` template lookup.
- Diagnosis: the module’s ESM test path must run with `NODE_OPTIONS=--experimental-vm-modules`; under that mode the report exposed the same-page-name comparator and defensive nullish branches.
- Fix: added genuine tests for equal-page name ordering, missing author/variant values, orphaned or malformed variants, and absent moderator snapshot data.
- Next time: use the repository’s ESM Jest mode for cloud renderers that resolve adjacent HTML templates with `import.meta.url`.
