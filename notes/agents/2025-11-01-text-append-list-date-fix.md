# Text Append List Date Fix Notes

- **Surprise:** Updating the toy date required renaming both the module directory and matching Jest suite; forgetting one breaks the import path. `rg` helped confirm there were no remaining references to the old date.
- **Diagnosis:** After moving the folders with `git mv`, Jest import paths still pointed at the old directory. A quick search showed the stale reference in the test file.
- **Future tip:** When adjusting toy dates, update the `src/blog.json` metadata at the same time so the site loader requests the correct module path.
