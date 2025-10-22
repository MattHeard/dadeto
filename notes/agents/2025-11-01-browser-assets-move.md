# Move browser asset directory

- **Challenge:** Relocating the static assets from `src/assets` into the browser bundle risked breaking the copy workflow that feeds `public/` because the path helpers and tests were tightly coupled to the old location.
- **Resolution:** Updated the Node directory resolver, unit expectations, and documentation while moving the files so the existing copy plan still targets `public/` and the tests cover the new `src/browser/assets` path.
