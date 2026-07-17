# Stats mobile overflow video analysis

- Unexpected hurdle: the earlier shared menu-sheet fix did not cover the stats page's chart payload.
- Diagnosis path: Drive video frames showed the page becoming horizontally zoomed after stats content loaded; a local 393px Playwright reproduction measured a 720px Sankey SVG expanding the document to 736px.
- Chosen fix: contain `#topStories` horizontally and make its SVG responsive with `max-width: 100%; height: auto`.
- Next-time guidance: test the page after asynchronous chart rendering, not only immediately after opening the mobile menu.
