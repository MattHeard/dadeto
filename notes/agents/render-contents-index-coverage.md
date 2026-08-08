# Render contents entrypoint coverage

- Unexpected hurdle: the index imported an HTML-rendering core containing `import.meta`, which Jest cannot parse in its CommonJS transform.
- Diagnosis: the index itself is dependency-wiring code; its behavior can be verified independently from the renderer implementation.
- Fix: mocked the renderer and render-support adapters while exercising fetch loaders, trigger wiring, request handling, forwarded render callbacks, and console-error construction.
- Next-time guidance: isolate entrypoint wiring from asset-loading cores when parser limitations prevent importing the production renderer.
