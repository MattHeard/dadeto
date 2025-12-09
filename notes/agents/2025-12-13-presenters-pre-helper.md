The remaining presenter clones were just the boilerplate that wraps the board/overview strings in `<pre>` elements. Instead of copying that DOM sequencing into each presenter, I exported a new `createPreFromContent` helper from `src/core/browser/presenters/pre.js` and have the fleet, clues, and TicTacToe presenters call it. They now agree on the DOM creation while keeping each file focused on its specific string-building logic.

After the change, `npm run duplication` still reports the `get-api-key-credit-v2` self-clone and the two `createDendriteHandler` snippets, but the three presenters no longer show up in the report. Linting and the full Jest suite also pass, so the helper behaves the same under the DOM abstraction.

Open question: should other presenters that manually create `<pre>` elements also consume this helper so future clones go away automatically?
