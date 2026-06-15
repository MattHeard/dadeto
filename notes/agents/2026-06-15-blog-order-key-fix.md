# 2026-06-15 · blog order and generated key fix

- Unexpected hurdle: the scheduler post landed with a manual `SCHD1` key and the manifest order no longer matched the public feed’s date-descending shape.
- Diagnosis path: I compared `src/build/blog.json` with the generated `public/blog.json`/`public/index.html`, then used `generateBlogKey` to confirm the generated title-based key should be `CONF1`.
- Chosen fix: renamed the post key to `CONF1`, reordered the top of `src/build/blog.json` into publication-date order, and rebuilt the public artifacts so the public index matched the manifest.
- Next-time guidance: when adding a new post, use the blog key generator up front and keep the manifest sorted by publication date before rebuilding, so `public/blog.json` stays easy to diff against the source manifest.
