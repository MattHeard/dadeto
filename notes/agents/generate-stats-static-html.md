Pulled the static HTML pieces out of `buildHtml` so the template literal only interpolates the dynamic counts and top-story data, and the large header/menu/script blobs now live in reusable constants. Having the constants near the top makes it obvious which sections never change (header, Google auth script, Sankey script shell, and mobile-menu toggler) while keeping the actual `buildHtml` return value easier to skim and reason about.

Lessons:

- When a single template becomes unwieldy, splitting off static sections as constants clarifies the dynamic bits and makes it easier to change layout later without hunting through a huge string.
- Keeping the Sankey script pieces in separate prefix/suffix constants keeps the JSON data injection narrow, which will help if we ever need to adjust how `resolvedTopStories` is serialized or validated.

Open question: Should we move these constants into a shared “layout fragments” module if other pages reuse the same header/menu structure?
