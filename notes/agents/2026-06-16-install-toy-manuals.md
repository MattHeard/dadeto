## Manual install loop
- Unexpected hurdle: the downloaded manuals were markdown files, but the public toy renderer only had a structured-manual path, so the content needed a small rendering extension instead of a straight file copy.
- Diagnosis: the manuals were already matched cleanly to existing toys by key, and the generated blog manifest was the right durable source for the public index. The missing piece was a markdown-aware manual block in the generator plus matching fixture coverage.
- Chosen fix: store each manual under `docs/toys/<toy>/manual.md`, embed the markdown string into `src/build/blog.json`, teach the generator to render `manual.markdown`, and cover both legacy array manuals and markdown manuals in Jest.
- Next-time guidance: when manuals arrive as plain markdown, prefer a single markdown rendering path with one focused test bundle instead of reshaping the source content into an older internal format.
